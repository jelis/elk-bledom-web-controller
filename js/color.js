/**
 * Color conversions. All functions are pure (no DOM) and tested.
 */
import { clamp } from './util.js';

/** "#rrggbb" → [r, g, b] with 0–255. @param {string} hex */
export const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** [r, g, b] → "#rrggbb". */
export const rgbToHex = (r, g, b) => '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');

/**
 * HSV → "#rrggbb".
 * @param {number} h hue 0–360
 * @param {number} s saturation 0–1
 * @param {number} v value 0–1
 */
export function hsvToHex(h, s, v) {
  const channel = (n) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return rgbToHex(...[5, 3, 1].map((n) => Math.round(channel(n) * 255)));
}

/**
 * Hue (0–360) of a color, or `null` for (nearly) gray colors, which have no meaningful hue.
 * @param {string} hex
 */
export function hexToHue(hex) {
  const [r, g, b] = hexToRgb(hex).map((x) => x / 255);
  const max = Math.max(r, g, b);
  const chroma = max - Math.min(r, g, b);
  if (chroma < 0.15) return null;
  let hue;
  if (max === r) hue = ((g - b) / chroma) % 6;
  else if (max === g) hue = (b - r) / chroma + 2;
  else hue = (r - g) / chroma + 4;
  hue *= 60;
  if (hue < 0) hue += 360;
  return Math.round(hue);
}

/**
 * Color temperature → [r, g, b]. Approximation by Tanner Helland, valid for roughly 1000–40000 K.
 * @param {number} kelvin
 */
export function kelvinToRgb(kelvin) {
  const t = kelvin / 100;
  let r;
  let g;
  let b;
  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = 255;
  }
  return [r, g, b].map((x) => Math.round(clamp(x, 0, 255)));
}

/** Colloquial name of a color temperature. @param {number} kelvin */
export function kelvinName(kelvin) {
  if (kelvin < 2300) return 'Kerzenlicht';
  if (kelvin < 3300) return 'Warmweiß';
  if (kelvin < 4600) return 'Neutralweiß';
  if (kelvin < 5800) return 'Kaltweiß';
  return 'Tageslicht';
}
