/**
 * All fixed settings of the app in one place.
 * Anyone who wants to customize something (location, colors, times) will find it here.
 */

/** Bluetooth identifiers of the ELK-BLEDOM / MELK controller. */
export const BLE = {
  service: '0000fff0-0000-1000-8000-00805f9b34fb',
  characteristic: '0000fff3-0000-1000-8000-00805f9b34fb',
  /** Device names the picker is filtered by (e.g. "MELK-OA21 C8"). */
  namePrefixes: ['MELK', 'ELK', 'LEDBLE', 'Triones'],
};

/** Minimum interval between two Bluetooth writes (ms); otherwise the controller drops commands. */
export const WRITE_INTERVAL_MS = 40;

/** Location for sunrise and sunset. */
export const LOCATION = { name: 'Frankfurt am Main', lat: 50.11, lon: 8.68 };

/** Only beyond this deviation (minutes) does the app resend the clock or alarm to the chain. */
export const SCHEDULE_TOLERANCE_MIN = 10;

/** While the app is open, it checks every 30 minutes whether anything needs to be resent. */
export const RESYNC_INTERVAL_MS = 30 * 60 * 1000;

/** Step size and limit of the offset from the sun time (minutes). */
export const OFFSET_STEP_MIN = 5;
export const OFFSET_LIMIT_MIN = 180;

/** Color temperature slider (Kelvin). */
export const KELVIN = { min: 2000, max: 6500, step: 50, default: 2700 };

/** Quick picks in the "Weiß" tab. */
export const WHITE_PRESETS = [
  { name: 'Kerzenlicht', kelvin: 2000 },
  { name: 'Warmweiß', kelvin: 2700 },
  { name: 'Neutralweiß', kelvin: 4000 },
  { name: 'Tageslicht', kelvin: 6500 },
];

/** Color swatches in the "Farbe" tab. */
export const COLOR_PRESETS = [
  { hex: '#ff0000', name: 'Rot' },
  { hex: '#ff7a00', name: 'Orange' },
  { hex: '#ffd000', name: 'Gelb' },
  { hex: '#00ff40', name: 'Grün' },
  { hex: '#00e5ff', name: 'Türkis' },
  { hex: '#0040ff', name: 'Blau' },
  { hex: '#8a00ff', name: 'Violett' },
  { hex: '#ff00c8', name: 'Pink' },
  { hex: '#ffffff', name: 'Weiß' },
  { hex: '#ffcf8a', name: 'Warmweiß' },
  { hex: '#ff5a5a', name: 'Hellrot' },
  { hex: '#7dffb0', name: 'Mint' },
];

/** The controller's built-in effects are 0x87 … 0x9C (22 in total). */
export const EFFECT_BASE = 0x87;
export const EFFECT_COUNT = 22;
/** Color of the orb while an effect is running. */
export const EFFECT_ORB_COLOR = '#bf5af2';

export const MAX_FAVORITES = 16;
