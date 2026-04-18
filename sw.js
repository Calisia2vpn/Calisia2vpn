const CACHE_VERSION = 'calisia-pwa-v4';
const OFFLINE_URL = './index.html';

const CORE_ASSETS = [
  './',
  './index.html',
  './auth.html',
  './tasks.html',
  './habits.html',
  './calendar.html',
  './goals.html',
  './notes.html',
  './meditation.html',
  './finance.html',
  './diet.html',
  './fitness.html',
  './social.html',
  './stats.html',
  './style.css',
  './runtime-config.js',
  './app.js',
  './auth-ui.js',
  './auth-guard.js',
  './i18n.js',
  './dashboard-data.js',
  './jalaali.min.js',
  './manifest.webmanifest',
  './icons/app-icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys
      .filter(key => key !== CACHE_VERSION)
      .map(key => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);

  // Cache-first for local static assets
  if (requestUrl.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request)
          .then(response => {
            const cloned = response.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(event.request, cloned));
            return response;
          })
          .catch(() => caches.match(OFFLINE_URL));
      })
    );
    return;
  }

  // Network-first for API/remote calls
  event.respondWith(
    fetch(event.request)
      .then(response => response)
      .catch(() => caches.match(event.request))
  );
});
