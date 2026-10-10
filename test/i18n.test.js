import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LOCALES, detectLanguage, getLanguage, setLanguage, t } from '../js/i18n.js';
import { COLOR_PRESETS, WHITE_PRESETS } from '../js/config.js';

const root = new URL('..', import.meta.url).pathname;
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

const sourceFiles = (dir) =>
  readdirSync(join(root, dir), { recursive: true })
    .filter((name) => name.endsWith('.js') && !name.startsWith('locales') && name !== 'i18n.js')
    .map((name) => readFileSync(join(root, dir, name), 'utf8'));

test('all languages have the same keys', () => {
  const reference = Object.keys(LOCALES.en).sort();
  for (const [code, messages] of Object.entries(LOCALES)) {
    assert.deepEqual(Object.keys(messages).sort(), reference, `keys of "${code}" differ from en`);
  }
});

test('all languages use the same placeholders per key', () => {
  for (const [key, text] of Object.entries(LOCALES.en)) {
    for (const [code, messages] of Object.entries(LOCALES)) {
      assert.deepEqual(placeholders(messages[key]), placeholders(text), `${code}: ${key}`);
    }
  }
});

test('every key used in the code or in index.html exists', () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const used = new Set();
  for (const source of [...sourceFiles('js'), html]) {
    for (const m of source.matchAll(/\bt\(\s*'([\w.]*\w)'/g)) used.add(m[1]);
    for (const m of source.matchAll(/data-i18n(?:-aria|-content)?="([\w.]+)"/g)) used.add(m[1]);
    for (const m of source.matchAll(/nameKey: '([\w.]+)'/g)) used.add(m[1]);
  }
  for (const preset of [...WHITE_PRESETS, ...COLOR_PRESETS]) used.add(preset.nameKey);
  for (let day = 0; day < 7; day++) used.add('day.short.' + day).add('day.long.' + day);
  for (const key of used) assert.ok(key in LOCALES.en, `missing key: ${key}`);
});

test('detectLanguage picks the first supported browser language', () => {
  assert.equal(detectLanguage(['de-DE', 'en']), 'de');
  assert.equal(detectLanguage(['fr-FR', 'de-AT']), 'de');
  assert.equal(detectLanguage(['en-US']), 'en');
  assert.equal(detectLanguage(['fr', 'ja']), 'en');
  assert.equal(detectLanguage([]), 'en');
});

test('t replaces placeholders and falls back to the key', () => {
  const previous = getLanguage();
  setLanguage('en');
  assert.equal(t('ble.connected', { name: 'MELK' }), 'Connected to MELK');
  assert.equal(t('no.such.key'), 'no.such.key');
  setLanguage('xx');
  assert.equal(getLanguage(), 'en');
  setLanguage(previous);
  assert.equal(t('ble.connected', { name: 'X' }), 'Verbunden mit X');
});
