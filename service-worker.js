/* service-worker.js — ImmatConnect — désactivation cache urgence */
'use strict';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then(clients => clients.forEach(client => client.navigate(client.url)))
      .catch(() => undefined)
  );
});

self.addEventListener('fetch', event => {
  // Ne jamais intercepter : tout repasse par le réseau / GitHub Pages.
  return;
});
