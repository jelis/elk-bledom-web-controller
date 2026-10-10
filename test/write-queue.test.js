import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WriteQueue } from '../js/write-queue.js';

const flush = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms));

function setup({ connected = true, failOn } = {}) {
  const written = [];
  const characteristic = {
    async writeValueWithoutResponse(bytes) {
      if (failOn && bytes[0] === failOn) throw new Error('Schreibfehler');
      written.push(bytes[0]);
    },
  };
  const errors = [];
  const queue = new WriteQueue({
    getCharacteristic: () => (connected ? characteristic : null),
    intervalMs: 1,
    onError: (error) => errors.push(error),
  });
  return { queue, written, errors };
}

test('sends packets in the order received', async () => {
  const { queue, written } = setup();
  queue.send(Uint8Array.of(1));
  queue.send(Uint8Array.of(2));
  queue.send(Uint8Array.of(3));
  await flush();
  assert.deepEqual(written, [1, 2, 3]);
});

test('packets with the same key replace each other (last value wins)', async () => {
  const { queue, written } = setup();
  queue.send(Uint8Array.of(9), 'andere');
  queue.send(Uint8Array.of(1), 'regler');
  queue.send(Uint8Array.of(2), 'regler');
  queue.send(Uint8Array.of(3), 'regler');
  await flush();
  assert.deepEqual(written, [9, 3]);
});

test('without a connection nothing is sent and the queue is cleared', async () => {
  const { queue, written } = setup({ connected: false });
  queue.send(Uint8Array.of(1));
  queue.send(Uint8Array.of(2));
  await flush();
  assert.deepEqual(written, []);
});

test('a write error is reported, the remaining packets are still sent', async () => {
  const { queue, written, errors } = setup({ failOn: 2 });
  queue.send(Uint8Array.of(1));
  queue.send(Uint8Array.of(2));
  queue.send(Uint8Array.of(3));
  await flush();
  assert.deepEqual(written, [1, 3]);
  assert.equal(errors.length, 1);
});
