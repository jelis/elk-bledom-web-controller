import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOCATION } from '../js/config.js';
import {
  ALL_DAYS,
  Schedule,
  alarmMinutes,
  circularDistance,
  clockDriftMinutes,
  daySummary,
  defaultAlarms,
  formatMinutes,
} from '../js/schedule.js';
import { createStorage, KEYS } from '../js/storage.js';

const NOON = new Date(2026, 9, 10, 12, 0, 0);

const memoryStorage = (initial = {}) => {
  const data = new Map(Object.entries(initial).map(([key, value]) => [key, JSON.stringify(value)]));
  return createStorage({
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, value),
  });
};

function setup({ storage = memoryStorage(), now = NOON } = {}) {
  const sent = [];
  const schedule = new Schedule({
    storage,
    send: (bytes, key) => sent.push({ hex: Buffer.from(bytes).toString('hex'), key }),
    coords: LOCATION,
    now: () => now,
  });
  return { schedule, sent, storage };
}

test('formatMinutes', () => {
  assert.equal(formatMinutes(0), '00:00');
  assert.equal(formatMinutes(7 * 60 + 5), '07:05');
  assert.equal(formatMinutes(23 * 60 + 59), '23:59');
});

test('circularDistance wraps across midnight', () => {
  assert.equal(circularDistance(10, 20), 10);
  assert.equal(circularDistance(23 * 60 + 55, 5), 10);
});

test('daySummary', () => {
  assert.equal(daySummary(0b1111111), 'Täglich');
  assert.equal(daySummary(0b0011111), 'Mo–Fr');
  assert.equal(daySummary(0b1100000), 'Sa, So');
  assert.equal(daySummary(0b0000101), 'Mo, Mi');
});

test('alarmMinutes: offset shifts the time and wraps across midnight', () => {
  const base = alarmMinutes({ enabled: true, days: ALL_DAYS, offset: 0 }, 0, NOON, LOCATION);
  assert.equal(alarmMinutes({ enabled: true, days: ALL_DAYS, offset: -15 }, 0, NOON, LOCATION), base - 15);
  assert.equal(alarmMinutes({ enabled: true, days: ALL_DAYS, offset: 180 }, 0, NOON, LOCATION), (base + 180) % 1440);
});

test('light on = sunset (evening), light off = sunrise (morning)', () => {
  const [on, off] = defaultAlarms();
  assert.ok(alarmMinutes(on, 0, NOON, LOCATION) > 17 * 60);
  assert.ok(alarmMinutes(off, 1, NOON, LOCATION) < 9 * 60);
});

test('clockDriftMinutes: infinite without a previous set, near 0 afterwards', () => {
  assert.equal(clockDriftMinutes(undefined, NOON), Infinity);
  const last = { at: NOON.getTime(), local: NOON.getTime() - NOON.getTimezoneOffset() * 60000 };
  assert.ok(clockDriftMinutes(last, new Date(NOON.getTime() + 3600e3)) < 0.01);
});

test('clockDriftMinutes detects a shifted phone clock', () => {
  const last = { at: NOON.getTime(), local: NOON.getTime() - NOON.getTimezoneOffset() * 60000 - 20 * 60000 };
  assert.ok(clockDriftMinutes(last, NOON) > 19);
});

test('first start: both alarms enabled and daily, gets saved', () => {
  const { schedule, storage } = setup();
  assert.deepEqual(
    schedule.alarms.map((a) => [a.enabled, a.days, a.offset]),
    [
      [true, ALL_DAYS, 0],
      [true, ALL_DAYS, 0],
    ],
  );
  assert.equal(storage.get(KEYS.alarmsMigrated, false), true);
});

test('alarms from the previous version (short field names) are migrated', () => {
  const storage = memoryStorage({
    [KEYS.alarmsMigrated]: true,
    [KEYS.alarms]: [
      { en: false, d: 0b0000011, off: 10, mode: 'set' },
      { en: true, d: ALL_DAYS, off: 0, mode: 'rise' },
    ],
  });
  const { schedule } = setup({ storage });
  assert.deepEqual(schedule.alarms[0], { enabled: false, days: 0b0000011, offset: 10 });
});

test('sync on first connect: clock and both alarms are sent', () => {
  const { schedule, sent } = setup();
  schedule.sync();
  assert.deepEqual(
    sent.map((s) => s.key),
    ['clock', 'alarm0', 'alarm1'],
  );
  assert.match(sent[0].hex, /^7e0783/);
  assert.match(sent[1].hex, /^7e0882[0-9a-f]{4}0000ffef$/); // light on, daily
  assert.match(sent[2].hex, /^7e0882[0-9a-f]{4}0001ffef$/); // light off, daily
});

test('sync right afterwards sends nothing (deviation under 10 minutes)', () => {
  const { schedule, sent } = setup();
  schedule.sync();
  sent.length = 0;
  schedule.sync();
  assert.deepEqual(sent, []);
});

test('sync resends the sun time if it deviates by more than 10 minutes', () => {
  const storage = memoryStorage();
  const first = setup({ storage });
  first.schedule.sync();
  // falsify the stored value by 15 minutes
  const sentRecord = storage.get(KEYS.sent, {});
  storage.set(KEYS.sent, { ...sentRecord, a0: sentRecord.a0 + 15 });
  const second = setup({ storage });
  second.schedule.sync();
  assert.deepEqual(
    second.sent.map((s) => s.key),
    ['alarm0'],
  );
});

test('sync resends the clock if the phone time jumps by more than 10 minutes (e.g. DST change)', () => {
  const storage = memoryStorage();
  setup({ storage }).schedule.sync();
  const record = storage.get(KEYS.sent, {});
  storage.set(KEYS.sent, { ...record, clock: { ...record.clock, local: record.clock.local - 60 * 60000 } });
  const { schedule, sent } = setup({ storage });
  schedule.sync();
  assert.deepEqual(
    sent.map((s) => s.key),
    ['clock'],
  );
});

test('disabling an alarm sends the delete command, re-enabling sends the time', () => {
  const { schedule, sent } = setup();
  schedule.setEnabled(0, false);
  assert.equal(sent.at(-1).hex, '7e0882ffffff0000ef');
  schedule.setEnabled(0, true);
  assert.match(sent.at(-1).hex, /^7e0882/);
  assert.equal(sent.at(-1).hex.slice(-4, -2), 'ff');
});

test('nothing is sent without a selected day, sending resumes with one day', () => {
  const { schedule, sent } = setup();
  for (let bit = 0; bit < 6; bit++) schedule.toggleDay(0, bit);
  const before = sent.length;
  schedule.toggleDay(0, 6); // last day deselected: alarm incomplete
  assert.equal(schedule.alarms[0].days, 0);
  assert.equal(sent.length, before);
  schedule.toggleDay(0, 2);
  assert.equal(sent.length, before + 1);
});

test('offset moves in 5-minute steps and is clamped at ±180', () => {
  const { schedule } = setup();
  schedule.shiftOffset(0, -5);
  schedule.shiftOffset(0, -5);
  assert.equal(schedule.alarms[0].offset, -10);
  for (let i = 0; i < 100; i++) schedule.shiftOffset(1, 5);
  assert.equal(schedule.alarms[1].offset, 180);
});

test('changes notify the subscribers', () => {
  const { schedule } = setup();
  let calls = 0;
  schedule.subscribe(() => calls++);
  schedule.shiftOffset(0, 5);
  schedule.sync();
  assert.equal(calls, 2);
});
