// Minimal service worker for PWA installability.
// Chrome requires a service worker with a fetch handler to show the install prompt.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// A fetch listener is required for Chrome to consider the app installable.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
