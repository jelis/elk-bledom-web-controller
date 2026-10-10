/**
 * Service worker: makes the app installable and usable offline.
 *
 * Strategy "network first": the latest version is always loaded; the cached copy is only used without a network.
 * When adding files to js/ or css/, add them to the PRECACHE list (test/sw.test.js checks this),
 * and bump CACHE_VERSION for larger changes.
 */
const CACHE_VERSION = 'lichterkette-v3';

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/main.js',
  './js/bluetooth.js',
  './js/color.js',
  './js/config.js',
  './js/protocol.js',
  './js/schedule.js',
  './js/state.js',
  './js/storage.js',
  './js/sun.js',
  './js/util.js',
  './js/write-queue.js',
  './js/ui/colors.js',
  './js/ui/dom.js',
  './js/ui/effects.js',
  './js/ui/favorites.js',
  './js/ui/power.js',
  './js/ui/schedule-view.js',
  './js/ui/slider.js',
  './js/ui/status.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html'))),
  );
});
