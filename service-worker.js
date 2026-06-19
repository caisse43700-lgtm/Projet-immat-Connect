/* service-worker.js — ImmatConnect — SESSION OBD-003d §21 */
'use strict';

const CACHE_NAME  = 'immatconnect-pro-v63';
const OFFLINE_URL = './offline.html';

// Fichiers critiques — allSettled individuel : une panne réseau n'annule pas l'install
// index.html intentionnellement absent : toujours servi depuis le réseau
const STATIC_CACHE = [
  './offline.html',
  './manifest.json',
  './utils.js?v=3',
  './calls.js?v=18',
  './messages.js?v=22',
  './badge.js',
  './ui.js?v=9',
  './core/invariants.js?v=45',
  './core/bus.js?v=50',
  './core/brain.js?v=45',
  './core/governance.js?v=45',
  './core/immatOrganism.js?v=46',
  './core/interaction-engine.js?v=5',
  './core/guardian-loop.js?v=7',
  './core/messages-runtime-diagnostics.js?v=1',
  './core/mobile-autotest.js?v=2',
  './core/obdSession.js',
  './core/obdGateway.js',
  './core/aiController.js',
  './core/agora-call-engine.js?v=5',
  './core/global-verification-center.js?v=7',
  './core/audio-manager.js?v=3',
  './core/call-screen.js?v=8',
  './core/call-notification-runtime.js?v=1',
  './core/calls-runtime-diagnostics.js?v=2',
  './core/guardian-summary-engine.js?v=1',
  './core/guardian-dashboard-summary.js?v=3',
];

// Scripts CDN tiers — cache optionnel, non bloquant
const CDN_CACHE = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/dist/umd/supabase.min.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://download.agora.io/sdk/release/AgoraRTC_N-4.20.0.js',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css',
];

const CDN_HOSTS = ['cdn.jsdelivr.net', 'unpkg.com', 'download.agora.io'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled([
        // allSettled pour STATIC et CDN : une panne réseau ne bloque plus l'install
        ...STATIC_CACHE.map(url => cache.add(url)),
        ...CDN_CACHE.map(url => cache.add(url)),
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
  // Navigation HTML — cache:'no-store' pour court-circuiter le cache HTTP de WebKit
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(new Request(e.request.url, { cache: 'no-store' }))
        .catch(() => caches.match(OFFLINE_URL))
    );
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

// ─── Message SKIP_WAITING depuis la page ─────────────────────────────────────
self.addEventListener('message', (e) => {
  if (!e.data) return;
  if (e.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data.type === 'SELF_DESTRUCT') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.registration.unregister());
  }
});

// ─── Push notifications ──────────────────────────────────────────────────────

self.addEventListener('push', (e) => {
  if (!e.data) return;
  let payload;
  try { payload = e.data.json(); } catch { payload = { title: 'ImmatConnect', body: e.data.text() }; }

  const title   = payload.title || 'ImmatConnect';
  const options = {
    body:      payload.body || '',
    icon:      './icon-192.png',
    badge:     './icon-192.png',
    tag:       payload.tag  || 'immatconnect',
    renotify:  true,
    data:      payload.data || {},
    vibrate:   [200, 100, 200],
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const data = e.notification.data || {};

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // Cherche une fenêtre déjà ouverte sur le site
      for (const c of list) {
        if (c.url.startsWith(self.location.origin) && 'focus' in c) {
          c.postMessage({ type: 'PUSH_NOTIFICATION_CLICKED', data });
          return c.focus();
        }
      }
      // Aucune fenêtre ouverte — ouvre l'app
      return clients.openWindow('./');
    })
  );
});
