/* service-worker.js — ImmatConnect — cache sûr post-merge PR #50 */
'use strict';

const CACHE_NAME = 'immatconnect-pro-v6-safe';
const STATIC_CACHE = [
  './manifest.json',
  './app.css?v=3',
  './messages.css?v=4',
  './calls.css?v=3',
  './utils.js?v=3',
  './core/invariants.js?v=45',
  './core/bus.js?v=45',
  './core/brain.js?v=45',
  './core/governance.js?v=45',
  './core/immatOrganism.js?v=45',
  './core/interaction-engine.js?v=1',
  './calls.js?v=2',
  './badge.js',
  './messages.js?v=15',
  './ui.js?v=6'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_CACHE).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Auth / Supabase / CDN : toujours réseau, jamais cache applicatif.
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('supabase.com') ||
    url.hostname.includes('unpkg.com') ||
    url.hostname.includes('jsdelivr.net')
  ) {
    return;
  }

  // Navigation HTML : réseau d'abord pour éviter ancien index + nouveaux scripts.
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(res => res)
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Assets locaux : réseau d'abord, cache seulement en secours.
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => undefined);
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
  }
});
