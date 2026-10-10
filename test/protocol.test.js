import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as protocol from '../js/protocol.js';

const hex = (bytes) => Buffer.from(bytes).toString('hex');

test('color, on/off, brightness, speed, effect (MELK-OA21 profile)', () => {
  assert.equal(hex(protocol.color(255, 128, 0)), '7e000503ff8000' + '00ef');
  assert.equal(hex(protocol.powerOn()), '7e0404f00001ff00ef');
  assert.equal(hex(protocol.powerOff()), '7e0404000000ff00ef');
  assert.equal(hex(protocol.brightness(50)), '7e040132' + '01ffff00ef');
  assert.equal(hex(protocol.effectSpeed(100)), '7e040264ffffff00ef');
  assert.equal(hex(protocol.effect(0x87)), '7e050387' + '06ffff00ef');
});

test('brightness and speed are clamped to 0–100', () => {
  assert.equal(protocol.brightness(250)[3], 100);
  assert.equal(protocol.brightness(-5)[3], 0);
  assert.equal(protocol.effectSpeed(101)[3], 100);
});

test('all packets have 9 bytes with start 7E and end EF', () => {
  const packets = [
    protocol.powerOn(),
    protocol.powerOff(),
    protocol.color(1, 2, 3),
    protocol.brightness(10),
    protocol.effectSpeed(10),
    protocol.effect(0x90),
    protocol.clock(new Date(2026, 9, 10, 18, 36, 0)),
    protocol.alarm(protocol.ALARM_TYPE.ON, 1117, 127),
    protocol.alarmClear(protocol.ALARM_TYPE.OFF),
  ];
  for (const bytes of packets) {
    assert.equal(bytes.length, 9);
    assert.equal(bytes[0], 0x7e);
    assert.equal(bytes[8], 0xef);
  }
});

// The following packets come from the Bluetooth capture of the original app (see docs/PROTOCOL.md)
test('clock: Saturday 18:36:00 as in the capture', () => {
  // 10.10.2026 is a Saturday
  assert.equal(hex(protocol.clock(new Date(2026, 9, 10, 18, 36, 0))), '7e078312240006ffef');
});

test('clock: Sunday is sent as 7 (assumed)', () => {
  assert.equal(protocol.clock(new Date(2026, 9, 11, 8, 0, 0))[6], 7);
});

test('alarm "light on" 18:37 on all days as in the capture', () => {
  assert.equal(hex(protocol.alarm(protocol.ALARM_TYPE.ON, 18 * 60 + 37, 0b1111111)), '7e088212250000ffef');
});

test('alarm "light off" 07:00 on all days as in the capture', () => {
  assert.equal(hex(protocol.alarm(protocol.ALARM_TYPE.OFF, 7 * 60, 0b1111111)), '7e088207000001ffef');
});

test('alarm: only the lower byte of the day mask counts, bit 7 is always set', () => {
  assert.equal(protocol.alarm(0, 0, 0)[7], 0x80);
  assert.equal(protocol.alarm(0, 0, 0xffff)[7], 0xff);
});

test('delete alarm as in the capture', () => {
  assert.equal(hex(protocol.alarmClear(protocol.ALARM_TYPE.ON)), '7e0882ffffff0000ef');
  assert.equal(hex(protocol.alarmClear(protocol.ALARM_TYPE.OFF)), '7e0882ffffff0100ef');
});
