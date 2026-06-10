/* service-worker.js — ImmatConnect — SESSION OBD-003d §19 */
'use strict';

const CACHE_NAME  = 'immatconnect-pro-v13';
const OFFLINE_URL = './offline.html';

// Fichiers critiques — addAll() atomique : tout ou rien
// index.html intentionnellement absent : toujours servi depuis le réseau
const STATIC_CACHE = [
  './offline.html',
  './manifest.json',
  './utils.js',
  './calls.js',
  './messages.js',
  './badge.js',
  './ui.js',
  './core/invariants.js',
  './core/bus.js',
  './core/brain.js',
  './core/governance.js',
  './core/immatOrganism.js',
  './core/interaction-engine.js',
  './core/guardian-loop.js',
  './core/messages-runtime-diagnostics.js',
  './core/mobile-autotest.js',
  './core/obdSession.js',
  './core/obdGateway.js',
  './core/aiController.js',
  './core/agora-call-engine.js',
  './core/global-verification-center.js',
];

// Scripts CDN tiers — cache optionnel, non bloquant
const CDN_CACHE = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/dist/umd/supabase.min.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://download.agora.io/sdk/release/AgoraRTC_N-4.20.0.js',
];

const CDN_HOSTS = ['cdn.jsdelivr.net', 'unpkg.com', 'download.agora.io'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all([
        cache.addAll(STATIC_CACHE),
        Promise.allSettled(CDN_CACHE.map(url => cache.add(url))),
      ]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => clients.forEach(c => {
        try { c.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME }); } catch (e) {}
      }))
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Supabase API — réseau uniquement, jamais mis en cache
  if (e.request.url.includes('supabase.co')) return;
  // Navigation HTML — toujours réseau, jamais mis en cache
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  const isCacheable = e.request.url.startsWith(self.location.origin)
    || CDN_HOSTS.some(h => e.request.url.includes(h));

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.status === 200 && isCacheable) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(cached => cached || caches.match(OFFLINE_URL)))
  );
});
