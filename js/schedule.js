/**
 * Schedule: "light on" at sunset, "light off" at sunrise.
 *
 * The chain only knows fixed times. The app computes the sun time and sends it as a regular alarm.
 * Because the sun time shifts daily, it is recomputed on every open and only
 * resent if it differs from the last sent one by more than SCHEDULE_TOLERANCE_MIN.
 *
 * Pure helper functions come first, the stateful `Schedule` class below.
 */
import { SCHEDULE_TOLERANCE_MIN, OFFSET_LIMIT_MIN } from './config.js';
import { KEYS } from './storage.js';
import * as protocol from './protocol.js';
import { sunEventMinutes } from './sun.js';
import { clamp } from './util.js';

export const DAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export const DAYS_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
export const ALL_DAYS = 0b1111111;

const MINUTES_PER_DAY = 1440;

/**
 * The chain's two alarm slots. The index is also the type in the Bluetooth packet.
 * @type {ReadonlyArray<{ type: number, event: import('./sun.js').SunEvent }>}
 */
export const ALARM_SLOTS = [
  { type: protocol.ALARM_TYPE.ON, event: 'sunset' },
  { type: protocol.ALARM_TYPE.OFF, event: 'sunrise' },
];

/**
 * @typedef {object} Alarm
 * @property {boolean} enabled
 * @property {number} days weekdays as a bitmask, bit 0 = Monday
 * @property {number} offset offset from the sun time in minutes (negative = before)
 */

/** @returns {Alarm[]} */
export const defaultAlarms = () => ALARM_SLOTS.map(() => ({ enabled: true, days: ALL_DAYS, offset: 0 }));

/** "00:00"–"23:59". @param {number} minutes */
export const formatMinutes = (minutes) =>
  String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');

/** Distance between two times of day (minutes since midnight), across midnight. */
export function circularDistance(a, b) {
  const diff = Math.abs(a - b) % MINUTES_PER_DAY;
  return Math.min(diff, MINUTES_PER_DAY - diff);
}

/** "Täglich", "Mo–Fr", "Sa, So" or the individual days. @param {number} days */
export function daySummary(days) {
  const mask = days & ALL_DAYS;
  if (mask === ALL_DAYS) return 'Täglich';
  if (mask === 0b0011111) return 'Mo–Fr';
  if (mask === 0b1100000) return 'Sa, So';
  return DAYS_SHORT.filter((_, bit) => mask & (1 << bit)).join(', ');
}

/**
 * Time of an alarm in minutes since midnight (sun time plus offset).
 * @param {Alarm} alarm
 * @param {number} slot index into ALARM_SLOTS
 * @param {Date} date
 * @param {import('./sun.js').Coordinates} coords
 * @returns {number | null} `null` if the sun does not rise/set on this day
 */
export function alarmMinutes(alarm, slot, date, coords) {
  const base = sunEventMinutes(date, coords, ALARM_SLOTS[slot].event);
  if (base === null) return null;
  return (((base + alarm.offset) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

/** Local time as milliseconds, so that time zone and DST changes become visible. */
const localTimeMs = (date) => date.getTime() - date.getTimezoneOffset() * 60000;

/**
 * How far (in minutes) the chain's clock probably deviates from the phone's clock.
 * The chain does not report its clock back, so it is calculated:
 * expected chain time = phone time at the last set + time elapsed since.
 * @param {{ at: number, local: number } | undefined} lastSet timestamp (ms) and local time (ms) at the last set
 * @param {Date} now
 * @returns {number} `Infinity` if the clock has never been set
 */
export function clockDriftMinutes(lastSet, now) {
  if (!lastSet) return Infinity;
  const expected = lastSet.local + (now.getTime() - lastSet.at);
  return Math.abs(localTimeMs(now) - expected) / 60000;
}

/**
 * Holds the alarms, sends them to the chain and remembers what was last sent.
 */
export class Schedule {
  #alarms;
  #sent;
  #storage;
  #send;
  #coords;
  #now;
  #listeners = new Set();

  /**
   * @param {object} options
   * @param {ReturnType<import('./storage.js').createStorage>} options.storage
   * @param {(bytes: Uint8Array, key?: string) => void} options.send sends a packet to the chain
   * @param {import('./sun.js').Coordinates} options.coords
   * @param {() => Date} [options.now] replaceable for tests
   */
  constructor({ storage, send, coords, now = () => new Date() }) {
    this.#storage = storage;
    this.#send = send;
    this.#coords = coords;
    this.#now = now;
    this.#alarms = this.#loadAlarms();
    this.#sent = storage.get(KEYS.sent, {});
  }

  /** On the first start with the sun schedule, defaults are set (daily, enabled). */
  #loadAlarms() {
    const stored = this.#storage.get(KEYS.alarms, null);
    const migrated = this.#storage.get(KEYS.alarmsMigrated, false);
    if (Array.isArray(stored) && stored.length === ALARM_SLOTS.length && migrated) {
      return stored.map(({ enabled, en, days, d, offset, off }) => ({
        // `en`, `d`, `off` are the short names used by older versions
        enabled: enabled ?? en ?? true,
        days: days ?? d ?? ALL_DAYS,
        offset: offset ?? off ?? 0,
      }));
    }
    const fresh = defaultAlarms();
    this.#storage.set(KEYS.alarms, fresh);
    this.#storage.set(KEYS.alarmsMigrated, true);
    return fresh;
  }

  /** @returns {readonly Alarm[]} */
  get alarms() {
    return this.#alarms;
  }

  /** Current time of the alarm (minutes since midnight) or `null`. */
  minutes(slot) {
    return alarmMinutes(this.#alarms[slot], slot, this.#now(), this.#coords);
  }

  /** @param {() => void} listener called after every change */
  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  setEnabled(slot, enabled) {
    const alarm = this.#alarms[slot];
    alarm.enabled = enabled;
    if (enabled && !(alarm.days & ALL_DAYS)) alarm.days = ALL_DAYS;
    this.#commit(slot);
  }

  /** @param {number} bit 0 = Monday … 6 = Sunday */
  toggleDay(slot, bit) {
    this.#alarms[slot].days ^= 1 << bit;
    this.#commit(slot);
  }

  /** @param {number} deltaMinutes e.g. +5 or −5 */
  shiftOffset(slot, deltaMinutes) {
    const alarm = this.#alarms[slot];
    alarm.offset = clamp(alarm.offset + deltaMinutes, -OFFSET_LIMIT_MIN, OFFSET_LIMIT_MIN);
    this.#commit(slot);
  }

  /** Sets the chain's clock (immediately, without a tolerance check). */
  sendClock() {
    const now = this.#now();
    this.#send(protocol.clock(now), 'clock');
    this.#remember('clock', { at: now.getTime(), local: localTimeMs(now) });
  }

  /**
   * Syncs the chain with the phone: clock and sun times are only sent
   * if they deviate by more than SCHEDULE_TOLERANCE_MIN. Called on connect, on open and periodically.
   */
  sync() {
    if (clockDriftMinutes(this.#sent.clock, this.#now()) > SCHEDULE_TOLERANCE_MIN) this.sendClock();
    this.#alarms.forEach((alarm, slot) => {
      if (!alarm.enabled) return;
      const minutes = this.minutes(slot);
      if (minutes === null) return;
      const lastSent = this.#sent['a' + slot];
      if (typeof lastSent !== 'number' || circularDistance(minutes, lastSent) > SCHEDULE_TOLERANCE_MIN) {
        this.#sendAlarm(slot);
      }
    });
    this.#emit();
  }

  /** Saves a change and sends it if it is complete (at least one day selected). */
  #commit(slot) {
    this.#storage.set(KEYS.alarms, this.#alarms);
    const alarm = this.#alarms[slot];
    if (!alarm.enabled || alarm.days & ALL_DAYS) this.#sendAlarm(slot);
    this.#emit();
  }

  #sendAlarm(slot) {
    const alarm = this.#alarms[slot];
    const { type } = ALARM_SLOTS[slot];
    if (!alarm.enabled) {
      this.#send(protocol.alarmClear(type), 'alarm' + slot);
      this.#remember('a' + slot, null);
      return;
    }
    const minutes = this.minutes(slot);
    if (minutes === null) return;
    this.#send(protocol.alarm(type, minutes, alarm.days), 'alarm' + slot);
    this.#remember('a' + slot, minutes);
  }

  #remember(key, value) {
    this.#sent[key] = value;
    this.#storage.set(KEYS.sent, this.#sent);
  }

  #emit() {
    this.#listeners.forEach((listener) => listener());
  }
}
