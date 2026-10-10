/**
 * Thin wrapper around localStorage. Values are stored as JSON.
 * Errors (private mode, blocked storage) are swallowed; the app then keeps running without storage.
 */

/**
 * All keys in one place. Do not change the values, or existing users lose their settings.
 */
export const KEYS = {
  color: 'color',
  kelvin: 'kelvin',
  power: 'on',
  brightness: 'bright',
  effectSpeed: 'speed',
  tab: 'tab',
  favorites: 'favs',
  autoConnect: 'auto',
  deviceId: 'deviceId',
  alarms: 'alarms',
  /** Marker that the alarms were switched to sunset/sunrise (old name, kept for compatibility). */
  alarmsMigrated: 'alv2',
  /** What was last sent to the chain (alarm times, clock). */
  sent: 'sent',
};

/**
 * @param {Pick<Storage, 'getItem' | 'setItem'>} [backend]
 */
export function createStorage(backend) {
  const resolve = () => backend ?? globalThis.localStorage;
  return {
    /**
     * @template T
     * @param {string} key
     * @param {T} fallback
     * @returns {T}
     */
    get(key, fallback) {
      try {
        const raw = resolve().getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    /**
     * @param {string} key
     * @param {unknown} value
     */
    set(key, value) {
      try {
        resolve().setItem(key, JSON.stringify(value));
      } catch {
        /* storage unavailable: ignore */
      }
    },
  };
}

export const storage = createStorage();
