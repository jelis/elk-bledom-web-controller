import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sunEventMinutes, sunEventTime } from '../js/sun.js';

const FRANKFURT = { lat: 50.11, lon: 8.68 };
const utcMinutes = (date) => date.getUTCHours() * 60 + date.getUTCMinutes();

// Reference values (astral library, Frankfurt am Main), tolerance 5 minutes
test('Frankfurt, 2026-10-10: sunrise about 05:39 UTC, sunset about 16:44 UTC', () => {
  const day = new Date(2026, 9, 10, 12);
  assert.ok(Math.abs(utcMinutes(sunEventTime(day, FRANKFURT, 'sunrise')) - (5 * 60 + 39)) <= 5);
  assert.ok(Math.abs(utcMinutes(sunEventTime(day, FRANKFURT, 'sunset')) - (16 * 60 + 44)) <= 5);
});

test('Frankfurt: summer sunset is later than winter sunset', () => {
  const summer = utcMinutes(sunEventTime(new Date(2026, 5, 21, 12), FRANKFURT, 'sunset'));
  const winter = utcMinutes(sunEventTime(new Date(2026, 11, 21, 12), FRANKFURT, 'sunset'));
  assert.ok(summer > winter + 4 * 60);
});

test('polar day: no sun time at the North Cape in June', () => {
  assert.equal(sunEventTime(new Date(2026, 5, 21, 12), { lat: 71.17, lon: 25.78 }, 'sunset'), null);
  assert.equal(sunEventMinutes(new Date(2026, 5, 21, 12), { lat: 71.17, lon: 25.78 }, 'sunrise'), null);
});

test('sunEventMinutes is between 0 and 1440', () => {
  const minutes = sunEventMinutes(new Date(2026, 9, 10, 12), FRANKFURT, 'sunset');
  assert.ok(Number.isInteger(minutes) && minutes >= 0 && minutes <= 1440);
});
