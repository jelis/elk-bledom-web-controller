/**
 * Clamps `value` to the range [min, max].
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
