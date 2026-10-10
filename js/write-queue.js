/**
 * Queue for Bluetooth writes.
 *
 * - There is a short pause between two writes; otherwise the controller drops commands.
 * - Commands with the same `key` replace each other: for a slider only the last value counts.
 */
export class WriteQueue {
  #pending = new Map();
  #running = false;
  #lastWrite = 0;
  #getCharacteristic;
  #intervalMs;
  #onError;

  /**
   * @param {object} options
   * @param {() => BluetoothRemoteGATTCharacteristic | null} options.getCharacteristic current characteristic, or `null` if disconnected
   * @param {number} options.intervalMs minimum interval between two writes
   * @param {(error: unknown) => void} [options.onError]
   */
  constructor({ getCharacteristic, intervalMs, onError = () => {} }) {
    this.#getCharacteristic = getCharacteristic;
    this.#intervalMs = intervalMs;
    this.#onError = onError;
  }

  /**
   * @param {Uint8Array} bytes
   * @param {string} [key] same key = an older, not yet sent command is replaced
   */
  send(bytes, key) {
    this.#pending.set(key ?? Symbol('write'), bytes);
    this.#run();
  }

  async #run() {
    if (this.#running) return;
    this.#running = true;
    try {
      while (this.#pending.size) {
        const [key, bytes] = this.#pending.entries().next().value;
        this.#pending.delete(key);

        const characteristic = this.#getCharacteristic();
        if (!characteristic) {
          this.#pending.clear();
          break;
        }

        const wait = this.#intervalMs - (Date.now() - this.#lastWrite);
        if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));

        try {
          if (characteristic.writeValueWithoutResponse) await characteristic.writeValueWithoutResponse(bytes);
          else await characteristic.writeValue(bytes);
        } catch (error) {
          this.#onError(error);
        }
        this.#lastWrite = Date.now();
      }
    } finally {
      this.#running = false;
    }
  }
}
