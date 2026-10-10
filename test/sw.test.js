import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const serviceWorker = readFileSync(join(root, 'sw.js'), 'utf8');
const precached = [...serviceWorker.matchAll(/'\.\/([^']+)'/g)].map((match) => match[1]);

const filesIn = (dir) =>
  readdirSync(join(root, dir), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(dir, entry.parentPath.slice(join(root, dir).length), entry.name).replaceAll('\\', '/'));

test('every file in js/, css/ and icons/ is in the service worker offline cache', () => {
  for (const file of [...filesIn('js'), ...filesIn('css'), ...filesIn('icons')]) {
    assert.ok(precached.includes(file), `${file} is missing from PRECACHE in sw.js`);
  }
});

test('every offline cache entry exists', () => {
  for (const file of precached.filter((entry) => entry !== '')) {
    assert.ok(existsSync(join(root, file)), `${file} is listed in PRECACHE but does not exist`);
  }
});

test('the icons from manifest.json exist', () => {
  const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
  for (const icon of manifest.icons) assert.ok(existsSync(join(root, icon.src)), icon.src);
});

test('manifest shortcuts only use the supported actions and existing icons', () => {
  const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
  const actions = manifest.shortcuts.map((shortcut) =>
    new URL(shortcut.url, 'https://example.com/').searchParams.get('action'),
  );
  assert.deepEqual(actions, ['on', 'off']);
  for (const shortcut of manifest.shortcuts) {
    for (const icon of shortcut.icons) assert.ok(existsSync(join(root, icon.src)), icon.src);
  }
});
