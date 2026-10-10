/**
 * Bluetooth commands of the ELK-BLEDOM / MELK controller.
 *
 * Every command is a 9-byte packet: `7E <length> <command> … EF`.
 * "MELK-OA21" profile from github.com/dave-code-ruiz/elkbledom. Alarms and clock come from a
 * Bluetooth capture of the original app. Details and verification status: docs/PROTOCOL.md
 */
import { clamp } from './util.js';

const START = 0x7e;
const END = 0xef;
const PACKET_LENGTH = 9;

/**
 * @param {...number} bytes exactly 9 bytes including start and end byte
 * @returns {Uint8Array}
 */
function packet(...bytes) {
  if (bytes.length !== PACKET_LENGTH || bytes[0] !== START || bytes[PACKET_LENGTH - 1] !== END) {
    throw new Error('Ungültiges Paket: ' + bytes.map((b) => b.toString(16)).join(' '));
  }
  return Uint8Array.from(bytes);
}

/** Alarm type in the controller: 0 = light on, 1 = light off. */
export const ALARM_TYPE = Object.freeze({ ON: 0, OFF: 1 });

export const powerOn = () => packet(0x7e, 0x04, 0x04, 0xf0, 0x00, 0x01, 0xff, 0x00, 0xef);
export const powerOff = () => packet(0x7e, 0x04, 0x04, 0x00, 0x00, 0x00, 0xff, 0x00, 0xef);

/** @param {number} r @param {number} g @param {number} b each 0–255 */
export const color = (r, g, b) => packet(0x7e, 0x00, 0x05, 0x03, r, g, b, 0x00, 0xef);

/** @param {number} percent 0–100 */
export const brightness = (percent) => packet(0x7e, 0x04, 0x01, clamp(percent, 0, 100), 0x01, 0xff, 0xff, 0x00, 0xef);

/** @param {number} percent 0–100 */
export const effectSpeed = (percent) => packet(0x7e, 0x04, 0x02, clamp(percent, 0, 100), 0xff, 0xff, 0xff, 0x00, 0xef);

/** @param {number} mode Controller effect number (0x87 … 0x9C) */
export const effect = (mode) => packet(0x7e, 0x05, 0x03, mode, 0x06, 0xff, 0xff, 0x00, 0xef);

/**
 * Sets the chain's clock. Weekday: Monday = 1 … Saturday = 6 (confirmed by the capture), Sunday = 7 (assumed).
 * @param {Date} date
 */
export function clock(date) {
  const weekday = date.getDay() === 0 ? 7 : date.getDay();
  return packet(0x7e, 0x07, 0x83, date.getHours(), date.getMinutes(), date.getSeconds(), weekday, 0xff, 0xef);
}

/**
 * Sets an alarm. The controller runs it on each selected day at the fixed time.
 * @param {number} type ALARM_TYPE.ON oder ALARM_TYPE.OFF
 * @param {number} minutesOfDay minutes since midnight (0–1439)
 * @param {number} days weekdays as a bitmask, bit 0 = Monday … bit 6 = Sunday (order assumed)
 */
export function alarm(type, minutesOfDay, days) {
  const hours = Math.floor(minutesOfDay / 60);
  const minutes = minutesOfDay % 60;
  return packet(0x7e, 0x08, 0x82, hours, minutes, 0x00, type, 0x80 | (days & 0x7f), 0xef);
}

/** Deletes an alarm. @param {number} type ALARM_TYPE.ON oder ALARM_TYPE.OFF */
export const alarmClear = (type) => packet(0x7e, 0x08, 0x82, 0xff, 0xff, 0xff, type, 0x00, 0xef);
