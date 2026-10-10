import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hexToHue, hexToRgb, hsvToHex, kelvinName, kelvinToRgb, rgbToHex } from '../js/color.js';

test('hexToRgb and rgbToHex are inverses of each other', () => {
  assert.deepEqual(hexToRgb('#ff7a00'), [255, 122, 0]);
  assert.equal(rgbToHex(255, 122, 0), '#ff7a00');
  assert.equal(rgbToHex(...hexToRgb('#0a0b0c')), '#0a0b0c');
});

test('hsvToHex returns the primary colors', () => {
  assert.equal(hsvToHex(0, 1, 1), '#ff0000');
  assert.equal(hsvToHex(120, 1, 1), '#00ff00');
  assert.equal(hsvToHex(240, 1, 1), '#0000ff');
  assert.equal(hsvToHex(0, 0, 1), '#ffffff');
});

test('hexToHue: primary colors, grays have no hue', () => {
  assert.equal(hexToHue('#ff0000'), 0);
  assert.equal(hexToHue('#00ff00'), 120);
  assert.equal(hexToHue('#0000ff'), 240);
  assert.equal(hexToHue('#ffffff'), null);
  assert.equal(hexToHue('#808080'), null);
});

test('hexToHue and hsvToHex are consistent', () => {
  for (const hue of [10, 75, 160, 215, 300, 350]) {
    assert.ok(Math.abs(hexToHue(hsvToHex(hue, 1, 1)) - hue) <= 1);
  }
});

test('kelvinToRgb: warm is reddish, cold is almost white', () => {
  const [r2, g2, b2] = kelvinToRgb(2000);
  assert.equal(r2, 255);
  assert.ok(g2 < 160 && b2 < 60);
  const [r65, g65, b65] = kelvinToRgb(6500);
  assert.ok(r65 > 240 && g65 > 240 && b65 > 240);
});

test('kelvinToRgb stays within 0–255', () => {
  for (let k = 1000; k <= 12000; k += 250) {
    for (const channel of kelvinToRgb(k)) assert.ok(Number.isInteger(channel) && channel >= 0 && channel <= 255);
  }
});

test('kelvinName', () => {
  assert.equal(kelvinName(2000), 'Kerzenlicht');
  assert.equal(kelvinName(2700), 'Warmweiß');
  assert.equal(kelvinName(4000), 'Neutralweiß');
  assert.equal(kelvinName(5000), 'Kaltweiß');
  assert.equal(kelvinName(6500), 'Tageslicht');
});
