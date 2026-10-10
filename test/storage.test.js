import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorage } from '../js/storage.js';

const memoryBackend = () => {
  const data = new Map();
  return { getItem: (key) => (data.has(key) ? data.get(key) : null), setItem: (key, value) => data.set(key, value) };
};

test('stores and reads JSON values', () => {
  const storage = createStorage(memoryBackend());
  storage.set('list', [1, 2, { a: true }]);
  assert.deepEqual(storage.get('list', null), [1, 2, { a: true }]);
});

test('returns the default value if nothing is stored', () => {
  assert.equal(createStorage(memoryBackend()).get('fehlt', 42), 42);
});

test('returns the default value for broken JSON', () => {
  const backend = memoryBackend();
  backend.setItem('kaputt', '{nicht json');
  assert.equal(createStorage(backend).get('kaputt', 'x'), 'x');
});

test('survives blocked storage without errors', () => {
  const locked = {
    getItem() {
      throw new Error('gesperrt');
    },
    setItem() {
      throw new Error('gesperrt');
    },
  };
  const storage = createStorage(locked);
  assert.doesNotThrow(() => storage.set('a', 1));
  assert.equal(storage.get('a', 'standard'), 'standard');
});
