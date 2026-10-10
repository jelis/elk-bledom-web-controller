/**
 * Bluetooth connection to the light chain (Web Bluetooth).
 *
 * `ChainConnection` handles pairing, connecting, automatic reconnecting and sending.
 * The UI only knows these events:
 *   - `status`           detail: text for the status line
 *   - `connectionchange` detail: { connected: boolean }
 *
 * Important Web Bluetooth quirks:
 *   - `requestDevice()` (the picker dialog) only works after a user tap and is only needed for the first pairing.
 *   - After that, `getDevices()` returns the paired device and the app connects without a dialog.
 *   - If the chain is out of range, `watchAdvertisements()` waits for its signal.
 */
import { BLE, WRITE_INTERVAL_MS } from './config.js';
import { KEYS } from './storage.js';
import { WriteQueue } from './write-queue.js';

const RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 1200;

/** User-friendly error message. */
export function friendlyError(error) {
  switch (error?.name) {
    case 'NotFoundError':
      return 'Keine Kette gefunden oder ausgewählt. Ist sie an und mit keiner anderen App verbunden?';
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Bluetooth wurde nicht erlaubt. Bitte in den Einstellungen freigeben.';
    case 'NetworkError':
      return 'Verbindung nicht möglich. Ist die Kette an, in der Nähe und nicht mit einer anderen App verbunden?';
    default:
      return 'Das hat nicht geklappt. Bitte versuche es noch einmal.';
  }
}

export class ChainConnection extends EventTarget {
  /** @type {BluetoothDevice | null} */ #device = null;
  /** @type {BluetoothRemoteGATTCharacteristic | null} */ #characteristic = null;
  #storage;
  #isAutoConnectEnabled;
  #queue;
  #attached = new WeakSet();
  /** The user disconnected on purpose: do not reconnect automatically. */
  #userDisconnected = false;
  /** The next disconnect comes from us and is not a connection loss. */
  #expectingDisconnect = false;
  #autoConnectBusy = false;
  /** @type {AbortController | null} */ #advertisementWatch = null;

  /**
   * @param {object} options
   * @param {ReturnType<import('./storage.js').createStorage>} options.storage
   * @param {() => boolean} options.isAutoConnectEnabled
   */
  constructor({ storage, isAutoConnectEnabled }) {
    super();
    this.#storage = storage;
    this.#isAutoConnectEnabled = isAutoConnectEnabled;
    this.#queue = new WriteQueue({
      getCharacteristic: () => this.#characteristic,
      intervalMs: WRITE_INTERVAL_MS,
      onError: (error) => {
        console.warn('Write error', error);
        this.#emitStatus('Befehl nicht gesendet. Bitte Verbindung prüfen.');
      },
    });
  }

  get isConnected() {
    return Boolean(this.#device?.gatt?.connected);
  }

  /**
   * Sends a packet to the chain. Packets with the same `key` replace each other (last value wins).
   * @param {Uint8Array} bytes
   * @param {string} [key]
   */
  send(bytes, key) {
    this.#queue.send(bytes, key);
  }

  /**
   * Opens the picker dialog and connects. Must be called from a user tap.
   * @param {object} [options]
   * @param {boolean} [options.showAllDevices] list every Bluetooth device instead of only known controllers
   *   (diagnostic fallback if the chain does not show up with the normal name/service filter)
   */
  async connectWithPicker({ showAllDevices = false } = {}) {
    this.#stopWatching();
    try {
      this.#emitStatus('Suche Gerät …');
      const device = await navigator.bluetooth.requestDevice(
        showAllDevices
          ? { acceptAllDevices: true, optionalServices: [BLE.service] }
          : {
              filters: [...BLE.namePrefixes.map((namePrefix) => ({ namePrefix })), { services: [BLE.service] }],
              optionalServices: [BLE.service],
            },
      );
      this.#attach(device);
      this.#storage.set(KEYS.deviceId, device.id);
      this.#userDisconnected = false;
      await this.#openGatt();
    } catch (error) {
      this.#emitStatus(friendlyError(error));
      this.#emitConnection(false);
    }
  }

  /** Disconnects at the user's request. Afterwards it does not reconnect automatically. */
  disconnect() {
    this.#expectingDisconnect = true;
    this.#userDisconnected = true;
    this.#device?.gatt?.disconnect();
  }

  /** The "auto-connect" switch changed. @param {boolean} enabled */
  setAutoConnect(enabled) {
    if (enabled) {
      this.#userDisconnected = false;
      this.autoConnect();
    } else {
      this.#stopWatching();
    }
  }

  /**
   * Connects without a dialog to the most recently paired chain. If it is out of range,
   * the app waits for its signal and then connects.
   */
  async autoConnect() {
    if (this.#autoConnectBusy || this.#userDisconnected) return;
    if (!this.#isAutoConnectEnabled()) return;
    if (!navigator.bluetooth) return;
    if (!navigator.bluetooth.getDevices) {
      this.#emitStatus('Dieser Browser kann nicht automatisch verbinden. Tippe auf „Verbinden“.');
      return;
    }
    if (this.isConnected) return;

    this.#autoConnectBusy = true;
    try {
      let devices;
      try {
        devices = await navigator.bluetooth.getDevices();
      } catch {
        this.#emitStatus('Tippe auf „Verbinden“.');
        return;
      }
      if (!devices.length) {
        this.#emitStatus('Noch nicht gekoppelt. Tippe einmal auf „Verbinden“, danach klappt es automatisch.');
        return;
      }

      const savedId = this.#storage.get(KEYS.deviceId, null);
      const device = devices.find((d) => d.id === savedId) ?? devices[0];
      this.#attach(device);
      this.#emitStatus('Verbinde automatisch mit ' + (device.name || 'Gerät') + ' …');

      try {
        await this.#openGatt();
        return;
      } catch {
        /* probably out of range: wait for the chain's signal */
      }
      if (await this.#waitForAdvertisement(device)) return;
      this.#emitStatus('Kette nicht gefunden. Tippe auf „Verbinden“.');
    } finally {
      this.#autoConnectBusy = false;
    }
  }

  /**
   * Waits for a radio signal from the chain and then connects.
   * @param {BluetoothDevice} device
   * @returns {Promise<boolean>} `true` if waiting was started
   */
  async #waitForAdvertisement(device) {
    if (!device.watchAdvertisements) return false;
    this.#stopWatching();
    const controller = (this.#advertisementWatch = new AbortController());

    const onAdvertisement = async () => {
      device.removeEventListener('advertisementreceived', onAdvertisement);
      controller.abort();
      if (this.#userDisconnected) return;
      try {
        await this.#openGatt();
      } catch {
        this.#emitStatus('Verbinden fehlgeschlagen. Tippe auf „Verbinden“.');
      }
    };
    device.addEventListener('advertisementreceived', onAdvertisement);

    try {
      await device.watchAdvertisements({ signal: controller.signal });
      this.#emitStatus('Warte, bis die Kette in Reichweite ist …');
      return true;
    } catch {
      device.removeEventListener('advertisementreceived', onAdvertisement);
      return false;
    }
  }

  #stopWatching() {
    try {
      this.#advertisementWatch?.abort();
    } catch {
      /* already finished */
    }
    this.#advertisementWatch = null;
  }

  /** Remembers the device and listens for unexpected disconnects. */
  #attach(device) {
    this.#device = device;
    if (!this.#attached.has(device)) {
      device.addEventListener('gattserverdisconnected', () => this.#onDisconnected());
      this.#attached.add(device);
    }
  }

  async #openGatt() {
    const device = this.#device;
    this.#emitStatus('Verbinde mit ' + (device.name || 'Gerät') + ' …');
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(BLE.service);
    this.#characteristic = await service.getCharacteristic(BLE.characteristic);
    this.#emitStatus('Verbunden mit ' + (device.name || 'Gerät'));
    this.#emitConnection(true);
  }

  async #onDisconnected() {
    this.#characteristic = null;
    this.#emitConnection(false);
    if (this.#expectingDisconnect) {
      this.#expectingDisconnect = false;
      this.#emitStatus('Getrennt');
      return;
    }
    this.#emitStatus('Verbindung verloren, versuche erneut …');
    for (let attempt = 0; attempt < RECONNECT_ATTEMPTS; attempt++) {
      try {
        await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY_MS));
        await this.#openGatt();
        return;
      } catch {
        /* next attempt */
      }
    }
    this.#emitStatus('Verbindung verloren.');
    this.autoConnect();
  }

  #emitStatus(text) {
    this.dispatchEvent(new CustomEvent('status', { detail: text }));
  }

  #emitConnection(connected) {
    this.dispatchEvent(new CustomEvent('connectionchange', { detail: { connected } }));
  }
}
