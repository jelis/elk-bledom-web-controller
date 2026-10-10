/**
 * Small observable state: `set()` merges changes in and notifies all subscribers.
 * @template {object} T
 * @param {T} initial
 */
export function createState(initial) {
  let current = { ...initial };
  const listeners = new Set();
  return {
    /** Current state (do not mutate directly, use `set`). */
    get: () => current,
    /** @param {Partial<T>} patch */
    set(patch) {
      current = { ...current, ...patch };
      listeners.forEach((listener) => listener(current));
    },
    /**
     * @param {(state: T) => void} listener
     * @returns {() => void} function to unsubscribe
     */
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/**
 * What the chain is currently showing (mirror of what was last sent; the chain reports nothing back).
 * - `color`: current color as "#rrggbb"
 * - `kelvin`: color temperature if the color comes from the white slider, otherwise `null`
 * - `effect`: number of the running effect (0-based) or `null`
 * - `on`: light on?
 */
export const lightState = createState({
  color: '#ff0000',
  /** @type {number | null} */ kelvin: null,
  /** @type {number | null} */ effect: null,
  on: true,
});
