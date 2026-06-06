/* service-worker.js — ImmatConnect — SESSION OBD-003d §18 */
'use strict';

const CACHE_NAME  = 'immatconnect-pro-v6';
const OFFLINE_URL = '/offline.html';
const STATIC_CACHE = [
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/utils.js',
  '/calls.js',
  '/messages.js',
  '/badge.js',
  '/ui.js',
  '/core/invariants.js',
  '/core/bus.js',
  '/core/brain.js',
  '/core/governance.js',
  '/core/immatOrganism.js',
  '/core/interaction-engine.js',
  '/core/guardian-loop.js',
  '/core/obdSession.js',
  '/core/obdGateway.js',
  '/core/aiController.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_CACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Supabase API — réseau uniquement, jamais mis en cache
  if (e.request.url.includes('supabase.co')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.status === 200 && e.request.url.startsWith(self.location.origin)) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(cached => cached || caches.match(OFFLINE_URL)))
  );
});
