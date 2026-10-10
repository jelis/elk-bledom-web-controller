/**
 * Clamps `value` to the range [min, max].
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * True on iPhone and iPad (including iPadOS, which reports a Mac user agent), where every browser is WebKit-based.
 * On iOS, Web Bluetooth only exists in special browsers such as Bluefy.
 */
export const isIos = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
