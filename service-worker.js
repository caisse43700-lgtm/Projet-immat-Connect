/* service-worker.js — ImmatConnect — désactivation cache sans boucle */
'use strict';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.registration.unregister())
      .catch(() => undefined)
  );
});

self.addEventListener('fetch', event => {
  // Ne jamais intercepter : tout repasse par le réseau / GitHub Pages.
  return;
});
