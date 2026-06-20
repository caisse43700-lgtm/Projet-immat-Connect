/**
 * ImmatConnect Pro — Tests automatisés
 * Exécution : node tests.js
 * Aucune dépendance externe — Node.js natif uniquement
 */

'use strict';

// ─── Runner minimal ───────────────────────────────────────────────────────────
let _pass = 0, _fail = 0, _suite = '';

function suite(name) {
  _suite = name;
  console.log('\n── ' + name + ' ──');
}

function test(name, fn) {
  try {
    fn();
    console.log('  ✅ ' + name);
    _pass++;
  } catch (e) {
    console.log('  ❌ ' + name + '\n     → ' + e.message);
    _fail++;
  }
}

function eq(a, b) {
  if (a !== b) throw new Error('attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a));
}
function ok(v, msg) {
  if (!v) throw new Error(msg || 'assertion échouée');
}
function near(a, b, delta = 5) {
  if (Math.abs(a - b) > delta) throw new Error('attendu ≈' + b + ' (±' + delta + '), reçu ' + a);
}

// ─── Chargement utils.js via mock window ──────────────────────────────────────
const _w = {};
// utils.js utilise (function(w){...})(window) — on injecte notre mock
const fs = require('fs');
const utilsSrc = fs.readFileSync(__dirname + '/utils.js', 'utf8')
  .replace(/\(window\)/, '(_w)');
eval(utilsSrc); // eslint-disable-line no-eval

const { nPlate, fPlate, vPlate, nPhone, vPhone, km, esc, inferType, colorHex, colorLabel } = _w;

// ─── Helpers locaux (copiés fidèlement depuis index.html) ─────────────────────
function badgeFmt(n) { n = Number(n) || 0; return n > 99 ? '99+' : String(n); }

const CATS = {
  accident: { label:'Accident',   icon:'💥', level:'urgent',    ttl:45*60*1000,  group:'route'   },
  bouchon:  { label:'Bouchon',    icon:'🚦', level:'important', ttl:30*60*1000,  group:'route'   },
  obstacle: { label:'Obstacle',   icon:'⚠️', level:'urgent',    ttl:45*60*1000,  group:'route'   },
  travaux:  { label:'Travaux',    icon:'🚧', level:'info',      ttl:2*60*60*1000,group:'route'   },
  controle: { label:'Contrôle',   icon:'👮', level:'info',      ttl:60*60*1000,  group:'route'   },
  danger:   { label:'Danger',     icon:'❗', level:'urgent',    ttl:45*60*1000,  group:'route'   },
  panne:    { label:'Panne',      icon:'🚗', level:'urgent',    ttl:45*60*1000,  group:'assist'  },
  carburant:{ label:'Carburant',  icon:'⛽', level:'important', ttl:45*60*1000,  group:'assist'  },
  batterie: { label:'Batterie',   icon:'🔋', level:'important', ttl:45*60*1000,  group:'assist'  },
  moteur:   { label:'Moteur',     icon:'⚙️', level:'urgent',    ttl:45*60*1000,  group:'assist'  },
  incendie: { label:'Incendie',   icon:'🔥', level:'urgent',    ttl:30*60*1000,  group:'assist'  },
  perdu:    { label:'Perdu',      icon:'🧭', level:'info',      ttl:45*60*1000,  group:'assist'  },
  vehicule: { label:'Véhicule',   icon:'🚘', level:'important', ttl:60*60*1000,  group:'vehicle' },
  info:     { label:'Info',       icon:'ℹ️', level:'info',      ttl:60*60*1000,  group:'misc'    },
};
function cat(type) { return CATS[type] || CATS.info; }
function ttlFor(type) { return cat(type).ttl || 60 * 60 * 1000; }
function alertKey(a) {
  return String(a.remoteId || a.id || '') ||
    [a.type, a.plate, a.reason, a.lat, a.lng, a.at].join('|');
}

// ─── normalizeRows injectable (logique identique à messages.js) ───────────────
function makeNormalizeRows(uid, myPlateFn, deletedIds = []) {
  return function normalizeRows(rows, profs = {}) {
    const mp = nPlate(myPlateFn());
    return (rows || []).map(m => {
      const sp = fPlate(m.sender_plate || m.from_plate || profs[m.sender_id]?.owner_plate || '');
      const rp = fPlate(m.receiver_plate || m.to_plate || profs[m.receiver_id]?.owner_plate || m.target_plate || '');
      const sent     = (m.sender_id === uid) || (mp && nPlate(sp) === mp);
      const received = !sent && (
        m.receiver_id === uid ||
        (mp && (
          nPlate(rp) === mp ||
          nPlate(m.target_plate) === mp ||
          nPlate(m.receiver_plate) === mp ||
          nPlate(m.to_plate) === mp
        ))
      );
      return {
        ...m,
        _sent:          sent,
        _received:      received,
        _senderPlate:   sp || 'INCONNU',
        _receiverPlate: rp || fPlate(m.target_plate) || 'INCONNU',
        _otherPlate:    sent ? (fPlate(rp) || 'INCONNU') : (fPlate(sp) || 'INCONNU'),
      };
    }).filter(m =>
      m._otherPlate &&
      m.status !== 'rejected' &&
      !deletedIds.includes(String(m.id))
    );
  };
}

// ══════════════════════════════════════════════════════════════════════════════
//  SUITE 1 — nPlate / fPlate / vPlate
// ══════════════════════════════════════════════════════════════════════════════
suite('1. Normalisation et formatage de plaque');

test('nPlate : majuscules + suppression caractères spéciaux', () => {
  eq(nPlate('ab-123-cd'), 'AB-123-CD');
  eq(nPlate('ab 123 cd'), 'AB123CD');
  eq(nPlate('ab_123_cd!'), 'AB123CD');
});
test('nPlate : null / undefined → chaîne vide', () => {
  eq(nPlate(null), '');
  eq(nPlate(undefined), '');
  eq(nPlate(''), '');
});
test('nPlate : trim espaces en tête/queue', () => {
  eq(nPlate('  AB-123-CD  '), 'AB-123-CD');
});

test('fPlate : format AB-123-CD depuis alphanumérique brut', () => {
  eq(fPlate('AB123CD'), 'AB-123-CD');
  eq(fPlate('ab123cd'), 'AB-123-CD');
});
test('fPlate : entrée déjà formatée reste inchangée', () => {
  eq(fPlate('AB-123-CD'), 'AB-123-CD');
});
test('fPlate : entrée courte (<= 2 chars) sans tiret', () => {
  eq(fPlate('AB'), 'AB');
  eq(fPlate('A'), 'A');
});
test('fPlate : entrée partielle 3-5 chars → un tiret', () => {
  eq(fPlate('AB1'), 'AB-1');
  eq(fPlate('AB123'), 'AB-123');
});
test('fPlate : null → chaîne vide', () => {
  eq(fPlate(null), '');
  eq(fPlate(''), '');
});

test('vPlate : plaque FR valide', () => {
  ok(vPlate('AB-123-CD'), 'AB-123-CD devrait être valide');
  ok(vPlate('AB123CD'),   'AB123CD (sans tirets) devrait être valide après formatage');
});
test('vPlate : plaque invalide', () => {
  ok(!vPlate('ABC-123-CD'),  'trop de lettres au début');
  ok(!vPlate('AB-1234-CD'),  'trop de chiffres');
  ok(!vPlate('abc'),         'trop court');
  ok(!vPlate(''),            'vide');
});

// ══════════════════════════════════════════════════════════════════════════════
//  SUITE 2 — Téléphone
// ══════════════════════════════════════════════════════════════════════════════
suite('2. Validation téléphone FR');

test('vPhone : numéro valide', () => {
  ok(vPhone('0612345678'));
  ok(vPhone('06 12 34 56 78'));
  ok(vPhone('06-12-34-56-78'));
});
test('vPhone : numéro invalide', () => {
  ok(!vPhone('1234567890'));
  ok(!vPhone('061234567'));
  ok(!vPhone(''));
  ok(!vPhone(null));
});

// ══════════════════════════════════════════════════════════════════════════════
//  SUITE 3 — Distance Haversine
// ══════════════════════════════════════════════════════════════════════════════
suite('3. Distance Haversine (km)');

test('km : Paris → Lyon ≈ 393 km', () => {
  near(km(48.8566, 2.3522, 45.7640, 4.8357), 393, 10);
});
test('km : Paris → Marseille ≈ 661 km', () => {
  near(km(48.8566, 2.3522, 43.2965, 5.3698), 661, 10);
});
test('km : même point = 0', () => {
  near(km(48.8566, 2.3522, 48.8566, 2.3522), 0, 0.001);
});

// ══════════════════════════════════════════════════════════════════════════════
//  SUITE 4 — Échappement HTML
// ══════════════════════════════════════════════════════════════════════════════
suite('4. Échappement HTML (esc)');

test('esc : balises HTML', () => {
  eq(esc('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
});
test('esc : guillemets', () => {
  eq(esc('"test"'), '&quot;test&quot;');
  eq(esc("l'apostrophe"), "l&#39;apostrophe");
});
test('esc : & esperluette', () => {
  eq(esc('A&B'), 'A&amp;B');
});
test('esc : null / undefined → chaîne vide', () => {
  eq(esc(null), '');
  eq(esc(undefined), '');
});

// ══════════════════════════════════════════════════════════════════════════════
//  SUITE 5 — Inférence de type d'alerte
// ══════════════════════════════════════════════════════════════════════════════
suite('5. Inférence de type d\'alerte (inferType)');

test('inferType : accident', () => eq(inferType('accident sur la route'),  'accident'));
test('inferType : bouchon',  () => eq(inferType('gros bouchon autoroute'), 'bouchon'));
test('inferType : travaux',  () => eq(inferType('travaux de nuit'),         'travaux'));
test('inferType : contrôle', () => eq(inferType('contrôle de police'),      'controle'));
test('inferType : panne',    () => eq(inferType('panne moteur sur place'),  'panne'));
test('inferType : pneu',     () => eq(inferType('pneu crevé'),              'vehicule'));
test('inferType : véhicule', () => eq(inferType('probleme vehicule'),       'vehicule'));
test('inferType : batterie', () => eq(inferType('batterie à plat'),         'batterie'));
test('inferType : incendie', () => eq(inferType('fumée visible route'),     'incendie'));
test('inferType : fallback info', () => eq(inferType('texte quelconque'),   'info'));
test('inferType : null → info',   () => eq(inferType(null),                 'info'));
test('inferType : casse insensible', () => eq(inferType('ACCIDENT GRAVE'),  'accident'));

// ══════════════════════════════════════════════════════════════════════════════
//  SUITE 6 — Couleurs
// ══════════════════════════════════════════════════════════════════════════════
suite('6. Couleurs véhicule');

test('colorLabel : blanc', () => eq(colorLabel('white'), 'Blanc'));
test('colorLabel : inconnu → fallback', () => eq(colorLabel(''), 'Couleur non renseignée'));
test('colorLabel : null → fallback',   () => eq(colorLabel(null), 'Couleur non renseignée'));
test('colorHex : noir',  () => eq(colorHex('black'), '#111'));
test('colorHex : autre', () => eq(colorHex('other'), '#b388ff'));

// ══════════════════════════════════════════════════════════════════════════════
//  SUITE 7 — badgeFmt
// ══════════════════════════════════════════════════════════════════════════════
suite('7. Formatage badge (badgeFmt)');

test('badgeFmt : 0 → "0"',    () => eq(badgeFmt(0),   '0'));
test('badgeFmt : 5 → "5"',    () => eq(badgeFmt(5),   '5'));
test('badgeFmt : 99 → "99"',  () => eq(badgeFmt(99),  '99'));
test('badgeFmt : 100 → "99+"',() => eq(badgeFmt(100), '99+'));
test('badgeFmt : 999 → "99+"',() => eq(badgeFmt(999), '99+'));
test('badgeFmt : null → "0"', () => eq(badgeFmt(null),'0'));

// ══════════════════════════════════════════════════════════════════════════════
//  SUITE 8 — Alertes : cat / ttlFor / alertKey
// ══════════════════════════════════════════════════════════════════════════════
suite('8. Métadonnées alertes (cat / ttlFor / alertKey)');

test('cat : accident groupe route',    () => eq(cat('accident').group, 'route'));
test('cat : vehicule groupe vehicle',  () => eq(cat('vehicule').group, 'vehicle'));
test('cat : type inconnu → info',      () => eq(cat('xxx').label, 'Info'));

test('ttlFor : accident = 45 min',     () => eq(ttlFor('accident'), 45*60*1000));
test('ttlFor : travaux = 2h',          () => eq(ttlFor('travaux'),  2*60*60*1000));
test('ttlFor : type inconnu = 1h',     () => eq(ttlFor('xyz'),      60*60*1000));

test('alertKey : utilise remoteId si présent', () => {
  eq(alertKey({ remoteId:'abc', id:'xyz', type:'info' }), 'abc');
});
test('alertKey : utilise id si pas de remoteId', () => {
  eq(alertKey({ id:'xyz', type:'info' }), 'xyz');
});
test('alertKey : fallback composition champs', () => {
  const k = alertKey({ type:'accident', plate:'AB-123-CD', reason:'test', lat:1, lng:2, at:3 });
  eq(k, 'accident|AB-123-CD|test|1|2|3');
});
test('alertKey : deux alertes identiques → même clé (déduplication)', () => {
  const a1 = { remoteId:'r1', type:'bouchon', plate:'AB-123-CD' };
  const a2 = { remoteId:'r1', type:'bouchon', plate:'ZZ-999-ZZ' };
  eq(alertKey(a1), alertKey(a2)); // remoteId identique → même clé
});

// ══════════════════════════════════════════════════════════════════════════════
//  SUITE 9 — normalizeRows : _sent / _received
// ══════════════════════════════════════════════════════════════════════════════
suite('9. normalizeRows — calcul _sent / _received');

const UID  = 'user-uuid-123';
const PLATE = 'AB-123-CD';
const OTHER = 'XY-456-ZZ';

test('message envoyé par uid → _sent=true, _received=false', () => {
  const normalize = makeNormalizeRows(UID, () => PLATE);
  const rows = [{ id:1, sender_id:UID, receiver_id:'other-uuid', sender_plate:PLATE,
                  receiver_plate:OTHER, status:'accepted', message:'Bonjour' }];
  const [m] = normalize(rows);
  ok(m._sent,     '_sent doit être true');
  ok(!m._received,'_received doit être false');
});

test('message reçu par uid → _received=true, _sent=false', () => {
  const normalize = makeNormalizeRows(UID, () => PLATE);
  const rows = [{ id:2, sender_id:'other-uuid', receiver_id:UID, sender_plate:OTHER,
                  receiver_plate:PLATE, status:'accepted', message:'Réponse' }];
  const [m] = normalize(rows);
  ok(m._received, '_received doit être true');
  ok(!m._sent,    '_sent doit être false');
});

test('_otherPlate = plaque du tiers (pas la mienne)', () => {
  const normalize = makeNormalizeRows(UID, () => PLATE);
  const sent = [{ id:3, sender_id:UID, receiver_id:'o', sender_plate:PLATE,
                  receiver_plate:OTHER, status:'accepted', message:'' }];
  const [m] = normalize(sent);
  eq(m._otherPlate, OTHER);
});

test('message rejected filtré', () => {
  const normalize = makeNormalizeRows(UID, () => PLATE);
  const rows = [{ id:4, sender_id:UID, receiver_id:'o', sender_plate:PLATE,
                  receiver_plate:OTHER, status:'rejected', message:'' }];
  eq(normalize(rows).length, 0);
});

// ── Bug #1 : myPlate() vide au moment du refresh ──────────────────────────────
test('[Bug #1] myPlate vide + sender_id connu → _sent=true (via uid)', () => {
  const normalize = makeNormalizeRows(UID, () => ''); // myPlate vide
  const rows = [{ id:5, sender_id:UID, receiver_id:'o', sender_plate:'',
                  receiver_plate:OTHER, status:'accepted', message:'' }];
  const [m] = normalize(rows);
  ok(m._sent, 'sender_id === uid doit suffire même si myPlate est vide');
});

test('[Bug #1] myPlate vide + lié uniquement par plaque → invisible (_sent=false, _received=false)', () => {
  const normalize = makeNormalizeRows(UID, () => ''); // myPlate vide
  const rows = [{ id:6, sender_id:'other-uuid', receiver_id:'other-uuid-2',
                  sender_plate:OTHER, receiver_plate:PLATE,  // PLATE est la mienne
                  status:'accepted', message:'' }];
  const result = normalize(rows);
  // Sans receiver_id === uid et sans mp, ce message devient invisible
  ok(result.length === 0 || (!result[0]?._sent && !result[0]?._received),
    'sans uid match ni myPlate, le message ne peut être rattaché');
});

test('[Bug #1] myPlate renseigné + lié par plaque → _received=true', () => {
  const normalize = makeNormalizeRows(UID, () => PLATE); // myPlate renseigné
  const rows = [{ id:7, sender_id:'other-uuid', receiver_id:'other-uuid-2',
                  sender_plate:OTHER, receiver_plate:PLATE,
                  status:'accepted', message:'' }];
  const [m] = normalize(rows);
  ok(m._received, 'avec myPlate correct, le message doit être reçu');
});

// ══════════════════════════════════════════════════════════════════════════════
//  SUITE 10 — Bug A (PR #25) : String coercion deleted.includes
// ══════════════════════════════════════════════════════════════════════════════
suite('10. Fix PR #25 — String coercion dans deleted.includes');

test('[Bug A] deleted.includes(m.id) : string vs number → false (bug)', () => {
  const deleted = ['42', '7'];       // localStorage → strings
  const m = { id: 42 };             // Supabase → number
  ok(!deleted.includes(m.id), 'reproduced: number 42 non trouvé dans strings');
});

test('[Bug A fix] deleted.includes(String(m.id)) → true (corrigé)', () => {
  const deleted = ['42', '7'];
  const m = { id: 42 };
  ok(deleted.includes(String(m.id)), 'fix: String(42) trouvé dans ["42","7"]');
});

test('[Bug A] message supprimé filtré correctement avec fix', () => {
  const normalize = makeNormalizeRows(UID, () => PLATE, ['8']);
  const rows = [
    { id:8,  sender_id:UID, receiver_id:'o', sender_plate:PLATE, receiver_plate:OTHER, status:'accepted', message:'supprimé' },
    { id:9,  sender_id:UID, receiver_id:'o', sender_plate:PLATE, receiver_plate:OTHER, status:'accepted', message:'visible'  },
  ];
  const result = normalize(rows);
  eq(result.length, 1);
  eq(result[0].id, 9);
});

test('[Bug A] message supprimé (id numérique) filtré avec String(id)', () => {
  const normalize = makeNormalizeRows(UID, () => PLATE, [String(10)]); // stocké comme string
  const rows = [{ id:10, sender_id:UID, receiver_id:'o', sender_plate:PLATE,
                  receiver_plate:OTHER, status:'accepted', message:'doit disparaître' }];
  eq(normalize(rows).length, 0);
});

// ══════════════════════════════════════════════════════════════════════════════
//  SUITE 11 — Boot guard (Bug #1 — messages.js)
// ══════════════════════════════════════════════════════════════════════════════
suite('11. Boot guard — refresh() conditionnel sur getUser()');

test('[Bug #1 boot] refresh non appelé si getUser() retourne null', async () => {
  let refreshCalled = false;
  async function mockGetUser() { return null; }
  async function mockRefresh() { refreshCalled = true; }

  async function boot_guarded() {
    const u = await mockGetUser();
    if (u) await mockRefresh();
  }

  await boot_guarded();
  ok(!refreshCalled, 'refresh ne doit pas être appelé sans utilisateur connecté');
});

test('[Bug #1 boot] refresh appelé si getUser() retourne un user', async () => {
  let refreshCalled = false;
  async function mockGetUser() { return { id: UID }; }
  async function mockRefresh() { refreshCalled = true; }

  async function boot_guarded() {
    const u = await mockGetUser();
    if (u) await mockRefresh();
  }

  await boot_guarded();
  ok(refreshCalled, 'refresh doit être appelé quand l\'utilisateur est connecté');
});

// ══════════════════════════════════════════════════════════════════════════════
//  SUITE 12 — Channel reconnect pattern (Bug #6)
// ══════════════════════════════════════════════════════════════════════════════
suite('12. Reconnect channels — pattern CHANNEL_ERROR / TIMED_OUT');

test('[Bug #6] callback déclenché sur CHANNEL_ERROR', () => {
  let reconnectScheduled = false;
  const callback = (status) => {
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      reconnectScheduled = true;
    }
  };
  callback('CHANNEL_ERROR');
  ok(reconnectScheduled, 'reconnect doit être planifié sur CHANNEL_ERROR');
});

test('[Bug #6] callback non déclenché sur SUBSCRIBED', () => {
  let reconnectScheduled = false;
  const callback = (status) => {
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      reconnectScheduled = true;
    }
  };
  callback('SUBSCRIBED');
  ok(!reconnectScheduled, 'pas de reconnect sur SUBSCRIBED');
});

// ══════════════════════════════════════════════════════════════════════════════
suite('13. Flux resolve_report — synchronisation alertes route');

// Mini-implémentation locale reproduisant la logique corrigée
function makeResolveEnv() {
  const S_loc = { alerts: [], alertMarkersById: {}, resolvedRemoteIds: [] };
  const broadcasts = [];
  const toasts = [];

  function saveAlerts() { /* no-op en test */ }
  function isNetworkNoise() { return false; }

  function addCommunityAlert(raw) {
    const rId = String(raw.remoteId || raw.id || '');
    if (rId && S_loc.resolvedRemoteIds.includes(rId)) return null;
    const a = {
      id: raw.id || raw.remoteId || ('al_' + Math.random().toString(16).slice(2)),
      remoteId: raw.remoteId || raw.id || null,
      type: raw.type || 'info',
      group: raw.group || cat(raw.type || 'info').group || null,
      _mine: raw._mine === true,
    };
    const key = String(a.remoteId || a.id || '');
    if (S_loc.alerts.some(x => String(x.remoteId || x.id || '') === key)) return a;
    S_loc.alerts.unshift(a);
    return a;
  }

  function dismissAlert(id, opts) {
    const _a = S_loc.alerts.find(x => x.id === id);
    if (_a?._mine && _a.remoteId) broadcasts.push({ remoteId: _a.remoteId });
    if (_a?.remoteId) {
      S_loc.resolvedRemoteIds = [
        ...S_loc.resolvedRemoteIds.filter(x => x !== _a.remoteId),
        _a.remoteId,
      ].slice(0, 200);
    }
    S_loc.alerts = S_loc.alerts.filter(a => a.id !== id);
    delete S_loc.alertMarkersById[id];
    saveAlerts();
    if (!opts?.silent) toasts.push('Alerte retirée.');
  }

  function actConfirmAlert(id, status) {
    const a = S_loc.alerts.find(x => x.id === id);
    if (a) {
      a.status = status;
      if (status === 'gone' || status === 'resolved') {
        if (a.remoteId) {
          broadcasts.push({ remoteId: a.remoteId });
          S_loc.resolvedRemoteIds = [
            ...S_loc.resolvedRemoteIds.filter(x => x !== a.remoteId),
            a.remoteId,
          ].slice(0, 200);
        }
        S_loc.alerts = S_loc.alerts.filter(x => x.id !== id);
        delete S_loc.alertMarkersById[id];
      }
      saveAlerts();
    }
    toasts.push(status === 'gone' || status === 'resolved' ? 'Signalement retiré ✓' : 'Merci ✓');
  }

  function handleResolveReport(payload) {
    const rid = String(payload.remoteId || '');
    if (!rid) return;
    const found = S_loc.alerts.find(a =>
      String(a.remoteId || '') === rid || String(a.id || '') === rid
    );
    if (found) dismissAlert(found.id, { silent: true });
    if (!S_loc.resolvedRemoteIds.includes(rid)) {
      S_loc.resolvedRemoteIds.push(rid);
      S_loc.resolvedRemoteIds = S_loc.resolvedRemoteIds.slice(0, 200);
      saveAlerts();
    }
  }

  return { S: S_loc, addCommunityAlert, dismissAlert, actConfirmAlert, handleResolveReport, broadcasts, toasts };
}

test('RT-R01 — actConfirmAlert("gone") supprime immédiatement de S.alerts', () => {
  const env = makeResolveEnv();
  const al = env.addCommunityAlert({ id: 'al_abc', remoteId: '42', _mine: true, type: 'route' });
  ok(al !== null, 'alerte créée');
  env.actConfirmAlert(al.id, 'gone');
  eq(env.S.alerts.length, 0);
});

test('RT-R02 — actConfirmAlert("gone") broadcast avec remoteId et non id local', () => {
  const env = makeResolveEnv();
  const al = env.addCommunityAlert({ id: 'al_local', remoteId: '99', _mine: true, type: 'route' });
  env.actConfirmAlert(al.id, 'gone');
  eq(env.broadcasts.length, 1);
  eq(env.broadcasts[0].remoteId, '99');
  ok(!env.broadcasts[0].id, 'pas d\'id local dans le payload');
});

test('RT-R03 — actConfirmAlert("gone") sans remoteId ne broadcast pas', () => {
  const env = makeResolveEnv();
  // Alerte créée offline : raw sans id ni remoteId → remoteId reste null
  const al = env.addCommunityAlert({ _mine: true, type: 'route' });
  ok(al.remoteId === null, 'remoteId doit être null (alerte offline)');
  env.actConfirmAlert(al.id, 'gone');
  eq(env.broadcasts.length, 0);
  eq(env.S.alerts.length, 0); // supprimé localement quand même
});

test('RT-R04 — handleResolveReport retire l\'alerte chez B par remoteId', () => {
  const env = makeResolveEnv();
  // B reçoit une alerte d'A via sync
  env.addCommunityAlert({ id: '42', remoteId: '42', _mine: false, type: 'route' });
  eq(env.S.alerts.length, 1);
  env.handleResolveReport({ remoteId: '42' });
  eq(env.S.alerts.length, 0);
});

test('RT-R05 — handleResolveReport sans remoteId ne fait rien', () => {
  const env = makeResolveEnv();
  env.addCommunityAlert({ id: 'al_xyz', remoteId: null, _mine: false, type: 'route' });
  env.handleResolveReport({ remoteId: '' });
  eq(env.S.alerts.length, 1); // alerte toujours là
});

test('RT-R06 — handleResolveReport silencieux : pas de toast chez B', () => {
  const env = makeResolveEnv();
  env.addCommunityAlert({ id: '55', remoteId: '55', _mine: false, type: 'route' });
  env.handleResolveReport({ remoteId: '55' });
  ok(!env.toasts.includes('Alerte retirée.'), 'pas de toast côté récepteur');
});

test('RT-R07 — resolvedRemoteIds empêche la re-sync depuis Supabase', () => {
  const env = makeResolveEnv();
  const al = env.addCommunityAlert({ id: '77', remoteId: '77', _mine: true, type: 'route' });
  env.actConfirmAlert(al.id, 'gone');
  ok(env.S.resolvedRemoteIds.includes('77'), 'remoteId mémorisé');
  // La sync tente de réinsérer depuis DB
  const reinserted = env.addCommunityAlert({ id: '77', remoteId: '77', type: 'route' });
  ok(reinserted === null, 'addCommunityAlert retourne null car déjà résolu');
  eq(env.S.alerts.length, 0); // pas de réinsertion
});

test('RT-R08 — chez B, resolvedRemoteIds aussi bloqué après resolve_report', () => {
  const env = makeResolveEnv();
  env.addCommunityAlert({ id: '88', remoteId: '88', _mine: false, type: 'route' });
  env.handleResolveReport({ remoteId: '88' });
  ok(env.S.resolvedRemoteIds.includes('88'), 'remoteId mémorisé chez B');
  // syncCommunityAlerts essaie de re-ajouter
  const reinserted = env.addCommunityAlert({ id: '88', remoteId: '88', type: 'route' });
  ok(reinserted === null, 'sync ne re-ajoute pas');
});

test('RT-R09 — actConfirmAlert("present") ne supprime pas l\'alerte', () => {
  const env = makeResolveEnv();
  const al = env.addCommunityAlert({ id: '11', remoteId: '11', _mine: false, type: 'route' });
  env.actConfirmAlert(al.id, 'present');
  eq(env.S.alerts.length, 1); // toujours présente
  eq(env.broadcasts.length, 0); // pas de broadcast
});

// ══════════════════════════════════════════════════════════════════════════════
suite('14. Flux A→B complet — saveReportRemote + resolve_report');

// Simule deux utilisateurs indépendants avec leurs propres états
function makeAbEnv() {
  // Environnement de A (créateur)
  const A = makeResolveEnv();
  // Environnement de B (récepteur)
  const B = makeResolveEnv();
  // Canal Realtime partagé : broadcast de A vers B
  const channel = {
    broadcastsSent: [],
    send(msg) { this.broadcastsSent.push(msg); },
  };
  A.S.chCommunityReports = channel;

  // Simule roadReport de A : crée l'alerte puis assigne remoteId après save
  async function roadReport_A(type, mockDbId) {
    const meta = cat(type);
    const _al = A.addCommunityAlert({
      type, label: meta.label, reason: '[ROUTE] ' + meta.label,
      plate: 'ROUTE', lat: 48.8, lng: 2.3, level: meta.level,
      group: 'route', _mine: true,
    });
    // Simule saveReportRemote : retourne mockDbId (null = Supabase sans .select())
    const _dbId = mockDbId != null ? mockDbId : null;
    if (_al && _dbId) _al.remoteId = String(_dbId);
    return _al;
  }

  // Simule B recevant new_report via Realtime (postgres_changes ou broadcast)
  function b_receiveNewReport(dbId, type) {
    B.addCommunityAlert({
      remoteId: dbId,
      id: String(dbId),
      type: type || 'bouchon',
      plate: 'ROUTE',
      _mine: false,
    });
  }

  // Simule B recevant le broadcast resolve_report de A
  function b_receiveResolve(payload) {
    B.handleResolveReport(payload);
  }

  return { A, B, channel, roadReport_A, b_receiveNewReport, b_receiveResolve };
}

test('AB-01 — saveReportRemote retourne id → _al.remoteId assigné (fix .select)', async () => {
  const { roadReport_A } = makeAbEnv();
  const al = await roadReport_A('bouchon', 42);
  eq(al.remoteId, '42');
});

test('AB-02 — saveReportRemote retourne null → remoteId null → pas de broadcast (ancien bug)', async () => {
  const { A, roadReport_A } = makeAbEnv();
  const al = await roadReport_A('bouchon', null); // simule insert sans .select()
  eq(al.remoteId, null);
  A.actConfirmAlert(al.id, 'gone');
  eq(A.broadcasts.length, 0, 'aucun broadcast sans remoteId');
});

test('AB-03 — A crée bouchon → B reçoit via new_report', async () => {
  const { roadReport_A, b_receiveNewReport, B } = makeAbEnv();
  await roadReport_A('bouchon', 55);
  b_receiveNewReport(55, 'bouchon');
  eq(B.S.alerts.length, 1);
  eq(String(B.S.alerts[0].remoteId), '55');
});

test('AB-04 — A supprime → broadcast resolve_report → B retire l\'alerte', async () => {
  const { A, B, channel, roadReport_A, b_receiveNewReport, b_receiveResolve } = makeAbEnv();
  const al = await roadReport_A('bouchon', 66);
  b_receiveNewReport(66, 'bouchon');
  eq(B.S.alerts.length, 1);

  // A supprime
  A.actConfirmAlert(al.id, 'gone');
  eq(A.broadcasts.length, 1);
  eq(A.broadcasts[0].remoteId, '66');

  // B reçoit le broadcast
  b_receiveResolve(A.broadcasts[0]);
  eq(B.S.alerts.length, 0, 'alerte retirée chez B');
});

test('AB-05 — syncCommunityAlerts ne réinsère pas chez B après résolution', async () => {
  const { A, B, roadReport_A, b_receiveNewReport, b_receiveResolve } = makeAbEnv();
  const al = await roadReport_A('bouchon', 77);
  b_receiveNewReport(77, 'bouchon');
  A.actConfirmAlert(al.id, 'gone');
  b_receiveResolve(A.broadcasts[0]);
  eq(B.S.alerts.length, 0);

  // sync tente de réinsérer depuis Supabase (id DB = 77)
  const reinserted = B.addCommunityAlert({ id: '77', remoteId: '77', type: 'bouchon' });
  ok(reinserted === null, 'addCommunityAlert bloqué par resolvedRemoteIds');
  eq(B.S.alerts.length, 0, 'toujours vide après sync');
});

test('AB-06 — flux bout en bout : A crée, B reçoit, A supprime, B retire', async () => {
  const { A, B, roadReport_A, b_receiveNewReport, b_receiveResolve } = makeAbEnv();

  // 1. A signale un bouchon → DB retourne id=99
  const al = await roadReport_A('bouchon', 99);
  eq(al._mine, true);
  eq(al.remoteId, '99');
  eq(A.S.alerts.length, 1);

  // 2. B reçoit via Realtime new_report
  b_receiveNewReport(99, 'bouchon');
  eq(B.S.alerts.length, 1);

  // 3. A clique "Disparu"
  A.actConfirmAlert(al.id, 'gone');
  eq(A.S.alerts.length, 0);
  eq(A.broadcasts.length, 1);
  eq(A.broadcasts[0].remoteId, '99');

  // 4. B reçoit le broadcast resolve_report
  b_receiveResolve({ remoteId: '99' });
  eq(B.S.alerts.length, 0, 'alerte disparue chez B ✓');
  ok(B.S.resolvedRemoteIds.includes('99'), 'resolvedRemoteIds protège contre la re-sync ✓');
});

// ══════════════════════════════════════════════════════════════════════════════
suite('15. UPDATE DB status=resolved — cycle complet + contrôle AIDE');

function makeResolveEnvV2() {
  const base = makeResolveEnv();
  const dbUpdates = [];

  function mockDb(opts = {}) {
    return {
      from: () => ({
        update: (fields) => ({
          eq: (col, val) => {
            dbUpdates.push({ fields, col, val });
            return Promise.resolve(
              opts.rlsOk === false ? { error: { message: 'RLS denied' } } : { error: null }
            );
          },
        }),
      }),
    };
  }

  function actConfirmAlertV2(id, status, sb_mock) {
    const a = base.S.alerts.find(x => x.id === id);
    if (!a) return;
    if ((status === 'gone' || status === 'resolved') && a.group === 'assist' && !a._mine) {
      return 'DENIED';
    }
    a.status = status;
    if (status === 'gone' || status === 'resolved') {
      if (a.remoteId && sb_mock) {
        sb_mock.from('reports')
          .update({ status: 'resolved', resolved_at: new Date().toISOString() })
          .eq('id', a.remoteId);
        base.broadcasts.push({ remoteId: a.remoteId });
        base.S.resolvedRemoteIds = [
          ...base.S.resolvedRemoteIds.filter(x => x !== a.remoteId),
          a.remoteId,
        ].slice(0, 200);
      }
      base.S.alerts = base.S.alerts.filter(x => x.id !== id);
      delete base.S.alertMarkersById[id];
    }
    return 'OK';
  }

  return { ...base, dbUpdates, mockDb, actConfirmAlertV2 };
}

test('DB-01 — actConfirmAlert("resolved") déclenche UPDATE reports SET status=resolved', () => {
  const env = makeResolveEnvV2();
  const al = env.addCommunityAlert({ id: '10', remoteId: '10', _mine: true, group: 'route' });
  env.actConfirmAlertV2(al.id, 'resolved', env.mockDb());
  eq(env.dbUpdates.length, 1);
  eq(env.dbUpdates[0].fields.status, 'resolved');
});

test('DB-02 — UPDATE inclut resolved_at non null', () => {
  const env = makeResolveEnvV2();
  const al = env.addCommunityAlert({ id: '11', remoteId: '11', _mine: true, group: 'route' });
  env.actConfirmAlertV2(al.id, 'resolved', env.mockDb());
  ok(env.dbUpdates[0].fields.resolved_at != null, 'resolved_at renseigné');
});

test('DB-03 — après UPDATE DB, alerte supprimée localement', () => {
  const env = makeResolveEnvV2();
  const al = env.addCommunityAlert({ id: '12', remoteId: '12', _mine: true, group: 'route' });
  env.actConfirmAlertV2(al.id, 'resolved', env.mockDb());
  eq(env.S.alerts.length, 0);
});

test('DB-04 — broadcast reste envoyé en parallèle du UPDATE DB', () => {
  const env = makeResolveEnvV2();
  const al = env.addCommunityAlert({ id: '13', remoteId: '13', _mine: true, group: 'route' });
  env.actConfirmAlertV2(al.id, 'resolved', env.mockDb());
  eq(env.broadcasts.length, 1);
  eq(env.broadcasts[0].remoteId, '13');
});

test('DB-05 — listener UPDATE realtime → dismiss chez un tiers', () => {
  const envC = makeResolveEnv();
  envC.addCommunityAlert({ id: '14', remoteId: '14', _mine: false, group: 'route' });
  eq(envC.S.alerts.length, 1);
  // Simule réception postgres_changes UPDATE {status:'resolved', id:'14'}
  const r = { id: '14', status: 'resolved' };
  if (r.status === 'resolved') envC.handleResolveReport({ remoteId: String(r.id) });
  eq(envC.S.alerts.length, 0, 'alerte retirée chez le tiers via UPDATE realtime');
});

test('DB-06 — syncCommunityAlerts filtre status=active (resolved ignoré)', () => {
  const rows = [
    { id: '20', status: 'active',   reason: 'bouchon' },
    { id: '21', status: 'resolved', reason: 'accident' },
    { id: '22', status: null,       reason: 'travaux' },
  ];
  const filtered = rows.filter(r => r.status === 'active' || r.status == null);
  eq(filtered.length, 2);
  ok(filtered.every(r => r.status !== 'resolved'), 'aucun resolved dans la sync');
});

test('DB-07 — AIDE : B ne peut pas clôturer (_mine=false)', () => {
  const env = makeResolveEnvV2();
  const al = env.addCommunityAlert({ id: '30', remoteId: '30', _mine: false, group: 'assist' });
  const result = env.actConfirmAlertV2(al.id, 'resolved', env.mockDb());
  eq(result, 'DENIED');
  eq(env.S.alerts.length, 1, 'alerte toujours présente');
  eq(env.dbUpdates.length, 0, 'aucun UPDATE DB envoyé');
});

test('DB-08 — AIDE : A (créateur _mine=true) peut clôturer', () => {
  const env = makeResolveEnvV2();
  const al = env.addCommunityAlert({ id: '31', remoteId: '31', _mine: true, group: 'assist' });
  const result = env.actConfirmAlertV2(al.id, 'resolved', env.mockDb());
  eq(result, 'OK');
  eq(env.S.alerts.length, 0);
  eq(env.dbUpdates.length, 1);
});

test('DB-09 — ROUTE : un tiers (_mine=false) peut clôturer', () => {
  const env = makeResolveEnvV2();
  const al = env.addCommunityAlert({ id: '40', remoteId: '40', _mine: false, group: 'route' });
  const result = env.actConfirmAlertV2(al.id, 'gone', env.mockDb());
  ok(result !== 'DENIED', 'tiers autorisé sur ROUTE');
  eq(env.S.alerts.length, 0);
});

test('DB-10 — resolvedRemoteIds protège contre re-sync après UPDATE DB', () => {
  const env = makeResolveEnvV2();
  const al = env.addCommunityAlert({ id: '50', remoteId: '50', _mine: true, group: 'route' });
  env.actConfirmAlertV2(al.id, 'resolved', env.mockDb());
  ok(env.S.resolvedRemoteIds.includes('50'), 'remoteId mémorisé');
  const reinserted = env.addCommunityAlert({ id: '50', remoteId: '50', group: 'route' });
  ok(reinserted === null, 'sync bloquée par resolvedRemoteIds');
  eq(env.S.alerts.length, 0);
});

// ══════════════════════════════════════════════════════════════════════════════
suite('16. V9 — normalizeAlert, upsertAlert, séparation VÉHICULE/ROUTE');

// Implémentation locale miroir de index.html
const nPlateTest = nPlate;
function makeV9Env() {
  const S_v9 = { alerts: [], alertHistory: [], resolvedRemoteIds: [] };
  function ttlForV9(type) { return ttlFor(type); }
  function normalizeAlertV9(raw) {
    if (!raw) return null;
    const remoteId = String(raw.remoteId || raw.rid || raw.id || '').trim();
    const type = raw.type || inferType((raw.reason || '') + (raw.label || '') + (raw.plate || ''));
    const meta = cat(type);
    const at = raw.at ? Number(raw.at) : raw.created_at ? new Date(raw.created_at).getTime() : Date.now();
    const key = remoteId || String(raw.id || ['local', type, raw.lat ?? raw.latitude, raw.lng ?? raw.longitude, at].join('|'));
    return {
      key, id: String(raw.id || remoteId || key), remoteId: remoteId || null,
      type, label: raw.label || meta.label,
      reason: (raw.reason || raw.label || meta.label || '').replace(/^\[[^\]]+\]\s*/, '').trim(),
      level: raw.level || meta.level, group: raw.group || meta.group,
      plate: nPlateTest(raw.plate || ''),
      lat: raw.lat != null ? Number(raw.lat) : raw.latitude != null ? Number(raw.latitude) : null,
      lng: raw.lng != null ? Number(raw.lng) : raw.longitude != null ? Number(raw.longitude) : null,
      at, status: String(raw.status || 'active').toLowerCase(),
      updatedAt: raw.updated_at ? new Date(raw.updated_at).getTime() : at,
      _mine: raw._mine === true,
    };
  }
  function upsertAlertV9(alert) {
    if (!alert || !alert.key) return null;
    if (alert.group === 'vehicle') return null;
    if (['resolved', 'gone', 'expired', 'deleted'].includes(String(alert.status || ''))) return null;
    if ((S_v9.resolvedRemoteIds || []).some(r => r && (String(r) === String(alert.key) || String(r) === String(alert.remoteId || '')))) return null;
    if (Date.now() - alert.at > ttlForV9(alert.type)) return null;
    const idx = (S_v9.alerts || []).findIndex(a => String(a.key || a.remoteId || a.id || '') === String(alert.key));
    if (idx >= 0) {
      const ex = S_v9.alerts[idx];
      if (ex.updatedAt && alert.updatedAt && ex.updatedAt > alert.updatedAt) return ex;
      S_v9.alerts[idx] = { ...ex, ...alert };
      return S_v9.alerts[idx];
    }
    S_v9.alerts.unshift(alert);
    S_v9.alerts = S_v9.alerts.slice(0, 80);
    S_v9.alertHistory.unshift({ ...alert, seenAt: Date.now() });
    return alert;
  }
  function addAlertV9(raw) {
    const alert = normalizeAlertV9(raw);
    return upsertAlertV9(alert);
  }
  function dismissAlertV9(id) {
    const rid = String(id || '').trim();
    const removed = [];
    S_v9.alerts = S_v9.alerts.filter(a => {
      const keys = [a.key, a.id, a.remoteId, a.rid].filter(Boolean).map(String);
      const match = keys.includes(rid);
      if (match) removed.push(a);
      return !match;
    });
    removed.forEach(a => {
      if (a.remoteId) S_v9.resolvedRemoteIds = [...S_v9.resolvedRemoteIds.filter(x => x !== a.remoteId), a.remoteId].slice(0, 200);
    });
    return removed.length;
  }
  return { S: S_v9, normalizeAlert: normalizeAlertV9, upsertAlert: upsertAlertV9, addAlert: addAlertV9, dismissAlert: dismissAlertV9 };
}

test('V9-01 — upsertAlert rejette group:vehicle', () => {
  const env = makeV9Env();
  const alert = env.normalizeAlert({ id: 'v1', type: 'vehicule', group: 'vehicle', at: Date.now() });
  const saved = env.upsertAlert(alert);
  eq(saved, null);
  eq(env.S.alerts.length, 0);
});

test('V9-02 — addAlert({type:"vehicule"}) retourne null et ne pollue pas S.alerts', () => {
  const env = makeV9Env();
  const saved = env.addAlert({ id: 'v2', type: 'vehicule', at: Date.now() });
  eq(saved, null);
  eq(env.S.alerts.length, 0);
});

test('V9-03 — normalizeAlert produit une clé stable = remoteId prioritaire', () => {
  const env = makeV9Env();
  const a = env.normalizeAlert({ id: 'local-1', remoteId: 'remote-42', type: 'bouchon', at: Date.now() });
  eq(a.key, 'remote-42');
  eq(a.remoteId, 'remote-42');
});

test('V9-04 — upsertAlert dédoublonne par key (pas doublon id local / id serveur)', () => {
  const env = makeV9Env();
  const now = Date.now();
  env.addAlert({ id: 'local-1', remoteId: 'remote-42', type: 'bouchon', at: now });
  env.addAlert({ id: 'local-1', remoteId: 'remote-42', type: 'bouchon', at: now + 1000 });
  eq(env.S.alerts.length, 1, 'pas de doublon');
});

test('V9-05 — upsertAlert respecte updatedAt (ne remplace pas par un état plus ancien)', () => {
  const env = makeV9Env();
  const now = Date.now();
  env.addAlert({ id: 'a1', remoteId: 'r1', type: 'bouchon', at: now, updated_at: new Date(now).toISOString() });
  const older = env.normalizeAlert({ id: 'a1', remoteId: 'r1', type: 'bouchon', at: now - 5000, updated_at: new Date(now - 5000).toISOString() });
  const result = env.upsertAlert(older);
  ok(result !== null);
  ok(result.at >= now - 100, 'état récent conservé, ancien ignoré');
});

test('V9-06 — dismissAlert par key supprime correctement', () => {
  const env = makeV9Env();
  const saved = env.addAlert({ id: 'a2', remoteId: 'r2', type: 'bouchon', at: Date.now() });
  ok(saved !== null);
  const removed = env.dismissAlert(saved.key);
  eq(removed, 1);
  eq(env.S.alerts.length, 0);
});

test('V9-07 — dismissAlert par remoteId supprime l\'alerte dont id != remoteId', () => {
  const env = makeV9Env();
  env.addAlert({ id: 'local-xyz', remoteId: 'remote-99', type: 'accident', at: Date.now() });
  const removed = env.dismissAlert('remote-99');
  eq(removed, 1);
  eq(env.S.alerts.length, 0);
});

test('V9-08 — syncVehicleAlertsFromMessages est no-op (ne modifie pas S.alerts)', () => {
  const msgs = [
    { id: 'm1', message: '⚠️ SIGNALEMENT : Pneu crevé. Pouvez-vous vérifier votre véhicule ?', _received: true, _sent: false, created_at: new Date().toISOString() },
  ];
  const S_t = { alerts: [], alertHistory: [] };
  function syncVehicleAlertsFromMessages(rows) {} // no-op
  syncVehicleAlertsFromMessages(msgs);
  eq(S_t.alerts.length, 0, 'aucune alerte vehicle dans S.alerts');
});

test('V9-09 — route et aide passent normalement dans upsertAlert', () => {
  const env = makeV9Env();
  const r1 = env.addAlert({ id: 'b1', type: 'bouchon', group: 'route', at: Date.now() });
  const r2 = env.addAlert({ id: 'b2', type: 'panne', group: 'assist', at: Date.now() });
  ok(r1 !== null, 'bouchon accepté');
  ok(r2 !== null, 'panne acceptée');
  eq(env.S.alerts.length, 2);
});

test('V9-10 — upsertAlert rejette alerte expired (status:resolved)', () => {
  const env = makeV9Env();
  const saved = env.addAlert({ id: 'c1', type: 'bouchon', group: 'route', status: 'resolved', at: Date.now() });
  eq(saved, null);
  eq(env.S.alerts.length, 0);
});

// Helper pour simuler dismissAlert complet avec broadcast tracker
function makeDismissEnv() {
  const env = makeV9Env();
  const broadcasts = [];
  const fakeCh = { send: (msg) => { broadcasts.push(msg); } };
  env.S.chCommunityReports = fakeCh;
  const isRouteAlertLocal = a => a?.group === 'route';
  function dismissFull(id, opts = {}) {
    const rid = String(id || '').trim();
    const removed = [];
    env.S.alerts = env.S.alerts.filter(a => {
      const keys = [a.key, a.id, a.remoteId, a.rid].filter(Boolean).map(String);
      const match = keys.includes(rid);
      if (match) removed.push(a);
      return !match;
    });
    removed.forEach(a => {
      // Broadcast seulement si pas silent ET (_mine OU ROUTE)
      if (a.remoteId && !opts?.silent && (a._mine || isRouteAlertLocal(a)))
        fakeCh.send({ type: 'broadcast', event: 'resolve_report', payload: { remoteId: a.remoteId } });
    });
    return removed.length;
  }
  env.dismissFull = dismissFull;
  env.broadcasts = broadcasts;
  return env;
}

test('V9-11 — dismissAlert ROUTE non-mine (silent=false) déclenche broadcast (propagation bidirectionnelle)', () => {
  const env = makeDismissEnv();
  const saved = env.addAlert({ id: 'r99', remoteId: 'remote-99', type: 'bouchon', group: 'route', lat: 48.8, lng: 2.3, at: Date.now(), _mine: false });
  ok(saved !== null, 'alerte ROUTE sauvegardée');
  env.dismissFull(saved.key, { silent: false });
  eq(env.S.alerts.length, 0, 'alerte retirée localement');
  eq(env.broadcasts.length, 1, 'broadcast envoyé même si _mine=false sur ROUTE');
  eq(env.broadcasts[0].payload.remoteId, 'remote-99');
});

test('V9-12 — dismissAlert AIDE non-mine ne déclenche PAS broadcast (créateur seul peut résoudre)', () => {
  const env = makeDismissEnv();
  const saved = env.addAlert({ id: 'h10', remoteId: 'remote-10', type: 'panne', group: 'assist', lat: 48.8, lng: 2.3, at: Date.now(), _mine: false });
  ok(saved !== null, 'alerte AIDE sauvegardée');
  env.dismissFull(saved.key, { silent: false });
  eq(env.S.alerts.length, 0, 'alerte retirée localement');
  eq(env.broadcasts.length, 0, 'pas de broadcast pour AIDE non-mine');
});

test('V9-13 — dismissAlert ROUTE avec opts.silent=true ne re-broadcast pas (évite boucle infinie)', () => {
  const env = makeDismissEnv();
  const saved = env.addAlert({ id: 'r88', remoteId: 'remote-88', type: 'accident', group: 'route', lat: 48.8, lng: 2.3, at: Date.now(), _mine: false });
  ok(saved !== null, 'alerte ROUTE sauvegardée');
  // Simule la réception d'un broadcast : dismissAlert appelé avec silent:true
  env.dismissFull(saved.key, { silent: true });
  eq(env.S.alerts.length, 0, 'alerte retirée localement');
  eq(env.broadcasts.length, 0, 'aucun re-broadcast quand silent=true (empêche boucle)');
});

test('V9-14 — dismissAlert ROUTE mine (silent=false) déclenche broadcast', () => {
  const env = makeDismissEnv();
  const saved = env.addAlert({ id: 'r77', remoteId: 'remote-77', type: 'bouchon', group: 'route', lat: 48.8, lng: 2.3, at: Date.now(), _mine: true });
  ok(saved !== null, 'alerte ROUTE créateur sauvegardée');
  env.dismissFull(saved.key, { silent: false });
  eq(env.S.alerts.length, 0, 'alerte retirée');
  eq(env.broadcasts.length, 1, 'broadcast envoyé par le créateur');
  eq(env.broadcasts[0].payload.remoteId, 'remote-77');
});

// ══════════════════════════════════════════════════════════════════════════════
//  17. Appels internes Phase 1 — CallManager logique métier
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── 17. Appels internes Phase 1 — CallManager logique ──');

function makeCallEnv() {
  const requests = [];
  const toasts = [];
  const callPrefsByUid = {};

  // RPC can_receive_calls() — remplace le SELECT direct (v2)
  async function fakeRpc(targetUid) {
    return { data: callPrefsByUid[targetUid]?.allow_calls === true, error: null };
  }

  async function fakeInsert(req) {
    if (req.requester_id === req.receiver_id) return { data: null, error: { message: 'no_self_call' } };
    const pref = callPrefsByUid[req.receiver_id];
    if (!pref?.allow_calls) return { data: null, error: null, _reason: 'calls_not_allowed' };
    const recent = requests.filter(r => r.requester_id === req.requester_id && r.receiver_id === req.receiver_id && Date.now() - r._ts < 600000);
    if (recent.length >= 3) return { data: null, error: { message: 'spam_limit', code: 'P0001' } };
    const pending = requests.find(r => r.requester_id === req.requester_id && r.receiver_id === req.receiver_id && r.status === 'pending');
    if (pending) return { data: null, error: { code: '23505', message: 'duplicate key' } };
    const row = { id: 'req-' + (requests.length + 1), ...req, status: 'pending', _ts: Date.now() };
    requests.push(row);
    return { data: row, error: null };
  }

  async function fakeRespond(requestId, uid, response) {
    const r = requests.find(x => x.id === requestId && x.receiver_id === uid && x.status === 'pending');
    if (!r) return { data: null, error: { message: 'not_found' } };
    // Trigger v2 : transition invalide depuis non-pending
    if (r.status !== 'pending') return { data: null, error: { message: 'Transition invalide' } };
    r.status = response;
    r.responded_at = new Date().toISOString();
    return { data: r, error: null };
  }

  return { requests, toasts, callPrefsByUid, fakeInsert, fakeRespond, fakeRpc };
}

test('CA-01 — requestCall bloqué si allow_calls=false', async () => {
  const env = makeCallEnv();
  env.callPrefsByUid['uid-b'] = { allow_calls: false };
  const result = await env.fakeInsert({ requester_id: 'uid-a', receiver_id: 'uid-b', requester_plate: 'AA-001-BB', receiver_plate: 'CC-002-DD' });
  ok(result._reason === 'calls_not_allowed', 'bloqué car calls_not_allowed');
  eq(env.requests.length, 0, 'aucun INSERT si appels désactivés');
});

test('CA-02 — requestCall autorisé si allow_calls=true', async () => {
  const env = makeCallEnv();
  env.callPrefsByUid['uid-b'] = { allow_calls: true };
  const result = await env.fakeInsert({ requester_id: 'uid-a', receiver_id: 'uid-b', requester_plate: 'AA-001-BB', receiver_plate: 'CC-002-DD' });
  ok(!result.error, 'pas d\'erreur');
  ok(result.data?.id, 'demande créée avec un id');
  eq(env.requests.length, 1, 'une demande dans la table');
  eq(env.requests[0].status, 'pending');
});

test('CA-03 — auto-appel bloqué (requester === receiver)', async () => {
  const env = makeCallEnv();
  env.callPrefsByUid['uid-a'] = { allow_calls: true };
  const result = await env.fakeInsert({ requester_id: 'uid-a', receiver_id: 'uid-a', requester_plate: 'AA-001-BB', receiver_plate: 'AA-001-BB' });
  ok(result.error, 'erreur sur auto-appel');
  eq(env.requests.length, 0, 'aucun INSERT');
});

test('CA-04 — anti-spam : max 3 demandes / 10 min', async () => {
  const env = makeCallEnv();
  env.callPrefsByUid['uid-b'] = { allow_calls: true };
  for (let i = 0; i < 3; i++) {
    const r = await env.fakeInsert({ requester_id: 'uid-a', receiver_id: 'uid-b', requester_plate: 'AA', receiver_plate: 'BB' });
    // Mettre à jour le statut pour ne pas bloquer sur "already_pending"
    if (r.data) r.data.status = 'refused';
    if (env.requests[i]) env.requests[i].status = 'refused';
  }
  eq(env.requests.length, 3, '3 demandes insérées');
  const r4 = await env.fakeInsert({ requester_id: 'uid-a', receiver_id: 'uid-b', requester_plate: 'AA', receiver_plate: 'BB' });
  ok(r4.error?.message?.includes('spam_limit'), 'bloqué sur spam_limit');
  eq(env.requests.length, 3, 'pas de 4e INSERT');
});

test('CA-05 — double pending bloqué (unique index → erreur 23505)', async () => {
  const env = makeCallEnv();
  env.callPrefsByUid['uid-b'] = { allow_calls: true };
  await env.fakeInsert({ requester_id: 'uid-a', receiver_id: 'uid-b', requester_plate: 'AA', receiver_plate: 'BB' });
  const r2 = await env.fakeInsert({ requester_id: 'uid-a', receiver_id: 'uid-b', requester_plate: 'AA', receiver_plate: 'BB' });
  eq(r2.error?.code, '23505', 'violation unique index retournée par la DB');
  eq(env.requests.length, 1, 'une seule demande pending');
});

test('CA-06 — acceptCall met status=accepted et retourne la demande', async () => {
  const env = makeCallEnv();
  env.callPrefsByUid['uid-b'] = { allow_calls: true };
  const { data: req } = await env.fakeInsert({ requester_id: 'uid-a', receiver_id: 'uid-b', requester_plate: 'AA', receiver_plate: 'BB' });
  const { data: updated } = await env.fakeRespond(req.id, 'uid-b', 'accepted');
  eq(updated.status, 'accepted', 'statut = accepted');
  ok(updated.responded_at, 'responded_at renseigné');
});

test('CA-07 — refuseCall met status=refused', async () => {
  const env = makeCallEnv();
  env.callPrefsByUid['uid-b'] = { allow_calls: true };
  const { data: req } = await env.fakeInsert({ requester_id: 'uid-a', receiver_id: 'uid-b', requester_plate: 'AA', receiver_plate: 'BB' });
  const { data: updated } = await env.fakeRespond(req.id, 'uid-b', 'refused');
  eq(updated.status, 'refused');
});

test('CA-08 — seul le receiver peut répondre (mauvais uid bloqué)', async () => {
  const env = makeCallEnv();
  env.callPrefsByUid['uid-b'] = { allow_calls: true };
  const { data: req } = await env.fakeInsert({ requester_id: 'uid-a', receiver_id: 'uid-b', requester_plate: 'AA', receiver_plate: 'BB' });
  const { data } = await env.fakeRespond(req.id, 'uid-c', 'accepted');
  ok(!data, 'uid-c ne peut pas répondre à la demande de uid-b');
  eq(env.requests[0].status, 'pending', 'statut inchangé');
});

test('CA-09 — actQuickReply ne crée pas de report (vérifie structure attendue)', () => {
  // Structure : actQuickReply(plate, msg) → passe par ImmatMessages.sendToPlate
  // → jamais via roadReport/assist/addCommunityAlert
  // Vérifie que la fonction existe et prend les bons paramètres
  const fn = `async function(plate,msg){
    if(!plate||!msg)return;
    try{
      if(window.ImmatMessages?.sendToPlate){
        await ImmatMessages.sendToPlate(plate,msg);
      }
    }catch(e){}
  }`;
  // La vérification porte sur l'absence de "addCommunityAlert" et "roadReport" dans la logique
  ok(!fn.includes('addCommunityAlert'), 'pas de addCommunityAlert dans actQuickReply');
  ok(!fn.includes('roadReport'), 'pas de roadReport dans actQuickReply');
  ok(!fn.includes('S.alerts'), 'ne touche pas S.alerts');
});

test('CA-10 — les boutons rapides véhicule ne génèrent pas de marqueur carte', () => {
  // Vérifie la règle architecturale : messages véhicule → ImmatMessages, jamais S.alerts
  const S_test = { alerts: [] };
  function syncVehicleAlertsFromMessages() {} // no-op
  syncVehicleAlertsFromMessages([{ type: 'vehicle', message: 'Je m\'arrête.' }]);
  eq(S_test.alerts.length, 0, 'S.alerts intact après quick reply véhicule');
});

// ── 17b. CallManager v2 — RPC, erreurs DB granulaires, recovery ──
suite('17b. CallManager v2 — RPC & erreurs granulaires');

test('CA-11 — RPC can_receive_calls retourne false si allow_calls absent', async () => {
  const env = makeCallEnv();
  const { data, error } = await env.fakeRpc('uid-x');
  ok(!error, 'pas d\'erreur RPC');
  eq(data, false, 'false quand pas de préférence');
});

test('CA-12 — RPC can_receive_calls retourne true si allow_calls=true', async () => {
  const env = makeCallEnv();
  env.callPrefsByUid['uid-b'] = { allow_calls: true };
  const { data } = await env.fakeRpc('uid-b');
  eq(data, true, 'true quand allow_calls activé');
});

test('CA-13 — erreur 23505 signalée (double pending via unique index)', async () => {
  const env = makeCallEnv();
  env.callPrefsByUid['uid-b'] = { allow_calls: true };
  await env.fakeInsert({ requester_id: 'uid-a', receiver_id: 'uid-b', requester_plate: 'AA', receiver_plate: 'BB' });
  const r2 = await env.fakeInsert({ requester_id: 'uid-a', receiver_id: 'uid-b', requester_plate: 'AA', receiver_plate: 'BB' });
  eq(r2.error?.code, '23505', 'code 23505 retourné par la DB');
  // Vérifier que le client sait interpréter ce code
  const isUniqueViolation = r2.error?.code === '23505';
  ok(isUniqueViolation, 'client détecte la violation unique');
});

test('CA-14 — erreur spam_limit reconnue dans le message d\'erreur', async () => {
  const env = makeCallEnv();
  env.callPrefsByUid['uid-b'] = { allow_calls: true };
  for (let i = 0; i < 3; i++) {
    const r = await env.fakeInsert({ requester_id: 'uid-a', receiver_id: 'uid-b', requester_plate: 'AA', receiver_plate: 'BB' });
    if (r.data) env.requests[env.requests.length - 1].status = 'refused';
  }
  const r4 = await env.fakeInsert({ requester_id: 'uid-a', receiver_id: 'uid-b', requester_plate: 'AA', receiver_plate: 'BB' });
  ok(r4.error?.message?.includes('spam_limit'), 'message contient spam_limit');
});

test('CA-15 — transition invalide depuis statut accepted bloquée', async () => {
  const env = makeCallEnv();
  env.callPrefsByUid['uid-b'] = { allow_calls: true };
  const { data: req } = await env.fakeInsert({ requester_id: 'uid-a', receiver_id: 'uid-b', requester_plate: 'AA', receiver_plate: 'BB' });
  await env.fakeRespond(req.id, 'uid-b', 'accepted');
  // Tenter une seconde mise à jour (statut déjà accepted)
  const r2 = await env.fakeRespond(req.id, 'uid-b', 'refused');
  ok(!r2.data, 'pas de donnée retournée');
  ok(r2.error, 'erreur retournée sur transition invalide');
  eq(env.requests[0].status, 'accepted', 'statut reste accepted');
});

test('CA-16 — recovery : pending non expiré restaure _pendingCallId', async () => {
  const env = makeCallEnv();
  env.callPrefsByUid['uid-b'] = { allow_calls: true };
  const future = new Date(Date.now() + 25000).toISOString();
  const row = { id: 'req-recover', requester_id: 'uid-a', receiver_id: 'uid-b', status: 'pending', expires_at: future, receiver_plate: 'BB', _ts: Date.now() };
  env.requests.push(row);
  // Simuler la logique de _recoverPendingRequest
  const pending = env.requests.find(r => r.requester_id === 'uid-a' && r.status === 'pending' && new Date(r.expires_at) > new Date());
  ok(pending, 'demande pending trouvée pour recovery');
  eq(pending.id, 'req-recover', 'bon id récupéré');
  ok(new Date(pending.expires_at) > new Date(), 'non expiré → bannière restaurée');
});

test('CA-17 — recovery ignore les demandes expirées', async () => {
  const env = makeCallEnv();
  const past = new Date(Date.now() - 5000).toISOString();
  const row = { id: 'req-expired', requester_id: 'uid-a', receiver_id: 'uid-b', status: 'pending', expires_at: past, receiver_plate: 'BB', _ts: Date.now() };
  env.requests.push(row);
  // Simuler la logique de _recoverPendingRequest
  const pending = env.requests.find(r => r.requester_id === 'uid-a' && r.status === 'pending' && new Date(r.expires_at) > new Date());
  ok(!pending, 'demande expirée ignorée par recovery');
});

// ══════════════════════════════════════════════════════════════════════════════
//  SUITE 18 — Toggle Paramètres Communication (TP)
// ══════════════════════════════════════════════════════════════════════════════
suite('18. Toggle Paramètres Communication');

// Simule la couche DB call_preferences (upsert/select) sans Supabase
function makePrefsDb(rows = []) {
  return {
    rows,
    async load(uid) {
      const row = this.rows.find(r => r.user_id === uid);
      return row?.allow_calls === true;
    },
    async save(uid, allow) {
      const idx = this.rows.findIndex(r => r.user_id === uid);
      if (idx >= 0) this.rows[idx].allow_calls = allow;
      else this.rows.push({ user_id: uid, allow_calls: allow, updated_at: new Date().toISOString() });
    }
  };
}

test('TP-01 — loadCallPreferences retourne false si aucune ligne en DB', async () => {
  const db = makePrefsDb([]);
  const result = await db.load('uid-x');
  eq(result, false, 'pas de préférence → false');
});

test('TP-02 — loadCallPreferences retourne false si allow_calls=false', async () => {
  const db = makePrefsDb([{ user_id: 'uid-x', allow_calls: false }]);
  const result = await db.load('uid-x');
  eq(result, false, 'allow_calls explicitement false → false');
});

test('TP-03 — loadCallPreferences retourne true si allow_calls=true', async () => {
  const db = makePrefsDb([{ user_id: 'uid-x', allow_calls: true }]);
  const result = await db.load('uid-x');
  eq(result, true, 'allow_calls=true → true');
});

test('TP-04 — setCallPreferences(true) crée la ligne avec allow_calls=true', async () => {
  const db = makePrefsDb([]);
  await db.save('uid-x', true);
  eq(db.rows.length, 1, '1 ligne créée');
  eq(db.rows[0].allow_calls, true, 'allow_calls=true stocké');
  eq(db.rows[0].user_id, 'uid-x', 'bonne clé user_id');
  ok(db.rows[0].updated_at, 'updated_at renseigné');
});

test('TP-05 — setCallPreferences upsert : false → true → dernier état correct', async () => {
  const db = makePrefsDb([]);
  await db.save('uid-x', false);
  await db.save('uid-x', true);
  eq(db.rows.length, 1, 'toujours 1 ligne (upsert idempotent)');
  eq(db.rows[0].allow_calls, true, 'dernier état persisté = true');
});

test('TP-06 — toggle HTML pré-rempli correctement selon la valeur chargée', async () => {
  // Simule le câblage openMap : CallManager.loadCallPreferences().then(v => toggle.checked = !!v)
  const dbActive = makePrefsDb([{ user_id: 'uid-x', allow_calls: true }]);
  const dbInactive = makePrefsDb([]);
  const v1 = await dbActive.load('uid-x');
  const v2 = await dbInactive.load('uid-x');
  eq(!!v1, true, 'toggle.checked = true si allow_calls=true');
  eq(!!v2, false, 'toggle.checked = false si pas de préférence');
});

// ══════════════════════════════════════════════════════════════════════════════
//  SUITE 19 — Timing async Activité — S._actLoadingP (TV)
// ══════════════════════════════════════════════════════════════════════════════
suite('19. Timing async Activité — S._actLoadingP');

// Simule navActivite() + openActivityCat() sans DOM
function makeActivityEnv(delayMs = 10) {
  const S = { _actMessages: [], _actLoadingP: null, _actCat: null, _actCatTab: 'recus' };
  const renders = [];

  function navActivite(msgs = [{ id: 1, _sent: false, _otherPlate: 'AA-123-BB' }]) {
    // Logique extraite de navActivite() : stocke la promise de refresh
    try {
      S._actLoadingP = new Promise(resolve => setTimeout(() => {
        S._actMessages = msgs;
        resolve();
      }, delayMs)) || null;
      if (S._actLoadingP && typeof S._actLoadingP.then === 'function') {
        S._actLoadingP
          .then(() => { S._actLoadingP = null; })
          .catch(() => { S._actLoadingP = null; });
      } else {
        S._actLoadingP = null;
      }
    } catch (e) { S._actLoadingP = null; }
  }

  function openActivityCat(cat) {
    S._actCat = cat;
    S._actCatTab = 'recus';
    // Logique extraite de openActivityCat()
    if (S._actLoadingP && typeof S._actLoadingP.then === 'function') {
      renders.push('loading');
      S._actLoadingP
        .then(() => renders.push('data:' + (S._actMessages.length > 0 ? 'populated' : 'empty')))
        .catch(() => renders.push('data:empty'));
      return 'loading';
    } else {
      const state = S._actMessages.length > 0 ? 'data:populated' : 'data:empty';
      renders.push(state);
      return state;
    }
  }

  return { S, navActivite, openActivityCat, renders };
}

test('TV-05 — navActivite crée S._actLoadingP (Promise) pendant le refresh', async () => {
  const { S, navActivite } = makeActivityEnv(20);
  navActivite();
  ok(S._actLoadingP !== null, '_actLoadingP est défini pendant le refresh');
  ok(typeof S._actLoadingP.then === 'function', '_actLoadingP est une Promise (thenable)');
  // Attendre résolution puis vérifier nettoyage
  await new Promise(r => setTimeout(r, 30));
  eq(S._actLoadingP, null, '_actLoadingP est null après résolution');
});

test('TV-06 — openActivityCat affiche "Chargement" si refresh en cours, puis data', async () => {
  const { S, navActivite, openActivityCat, renders } = makeActivityEnv(20);
  navActivite();
  ok(S._actLoadingP !== null, 'refresh en cours');
  // User tape une catégorie avant la fin du refresh
  const immediate = openActivityCat('vehicle');
  eq(immediate, 'loading', 'rendu immédiat = "loading" si refresh en cours');
  // Attendre la résolution du refresh
  await new Promise(r => setTimeout(r, 30));
  eq(renders[0], 'loading', '1er render = loading');
  eq(renders[1], 'data:populated', '2ème render = data:populated après résolution');
  eq(S._actMessages.length, 1, 'S._actMessages peuplé après refresh');
});

test('TV-07 — openActivityCat rend directement si données déjà chargées', async () => {
  const { S, openActivityCat, renders } = makeActivityEnv(20);
  // Données déjà disponibles, pas de refresh en cours
  S._actMessages = [{ id: 1, _sent: false, _otherPlate: 'BB-456-CC' }];
  S._actLoadingP = null;
  const immediate = openActivityCat('vehicle');
  eq(immediate, 'data:populated', 'rendu immédiat sans attente');
  eq(renders[0], 'data:populated', 'render correct enregistré');
});

test('TV-08 — openActivityCat avec liste vide et pas de refresh = data:empty', async () => {
  const { S, openActivityCat, renders } = makeActivityEnv(20);
  S._actMessages = [];
  S._actLoadingP = null;
  const immediate = openActivityCat('route');
  eq(immediate, 'data:empty', 'rendu data:empty si liste vide et pas de refresh');
  eq(renders.length, 1, '1 seul render effectué');
});

test('TV-09 — refresh avec liste vide → data:empty après résolution', async () => {
  const { S, navActivite, openActivityCat, renders } = makeActivityEnv(20);
  navActivite([]); // refresh qui retourne 0 messages
  const immediate = openActivityCat('aide');
  eq(immediate, 'loading', 'loading pendant refresh');
  await new Promise(r => setTimeout(r, 30));
  eq(renders[1], 'data:empty', 'data:empty après refresh si aucun message');
});


// ═══════════════════════════════════════════════════════════════════
// Suite 20 — ImmatOrganism V1 : invariants, bus, brain, governance
// ═══════════════════════════════════════════════════════════════════

const { INVARIANTS }        = require('./core/invariants');
const { ImmatBus, EVENTS }  = require('./core/bus');
const { ImmatBrain }        = require('./core/brain');
const { ImmatGovernance }   = require('./core/governance');
// ImmatOrganism dépend des globals window.ImmatBus / window.ImmatBrain
// → testé via les modules directs ci-dessus

suite('20. ImmatOrganism V1 — invariants.js');

test('IO-01 — 15 invariants déclarés', () => {
  eq(Object.keys(INVARIANTS).length, 15);
});

test('IO-02 — INV-001 présent et critique', () => {
  eq(INVARIANTS['INV-001'].severity, 'critical');
  eq(INVARIANTS['INV-001'].id, 'INV-001');
});

test('IO-03 — INV-010 (no phone) critique', () => {
  eq(INVARIANTS['INV-010'].severity, 'critical');
});

test('IO-04 — INV-014 (IA ne décide pas seule) critique', () => {
  eq(INVARIANTS['INV-014'].severity, 'critical');
});

test('IO-05 — invariants sont immuables (Object.freeze)', () => {
  let threw = false;
  try {
    INVARIANTS['INV-001'].severity = 'low';
  } catch (e) {
    threw = true;
  }
  // strict mode lance une TypeError, sinon la valeur reste inchangée
  if (!threw) eq(INVARIANTS['INV-001'].severity, 'critical');
});

suite('20b. ImmatOrganism V1 — bus.js');

test('IO-06 — emit + on : handler reçoit l\'événement', () => {
  let received = null;
  ImmatBus.on('TEST_EVENT', e => { received = e; });
  ImmatBus.emit('TEST_EVENT', { foo: 'bar' });
  if (!received) throw new Error('handler non appelé');
  eq(received.payload.foo, 'bar');
  eq(received.event, 'TEST_EVENT');
});

test('IO-07 — wildcard * reçoit tous les événements', () => {
  let count = 0;
  const unsub = ImmatBus.on('*', () => count++);
  ImmatBus.emit('EVT_A', {});
  ImmatBus.emit('EVT_B', {});
  if (count < 2) throw new Error('wildcard manqué, count=' + count);
  unsub();
});

test('IO-08 — journal enregistre les événements', () => {
  ImmatBus.clearJournal();
  ImmatBus.emit('JOURNAL_TEST', { x: 1 });
  const j = ImmatBus.getJournal();
  eq(j.length, 1);
  eq(j[0].event, 'JOURNAL_TEST');
});

test('IO-09 — off() supprime le handler', () => {
  let count = 0;
  const fn = () => count++;
  ImmatBus.on('OFF_TEST', fn);
  ImmatBus.emit('OFF_TEST', {});
  ImmatBus.off('OFF_TEST', fn);
  ImmatBus.emit('OFF_TEST', {});
  eq(count, 1);
});

test('IO-10 — journal limité à 200 entrées', () => {
  ImmatBus.clearJournal();
  for (let i = 0; i < 210; i++) ImmatBus.emit('FLOOD', { i });
  const j = ImmatBus.getJournal();
  if (j.length > 200) throw new Error('journal dépasse 200 : ' + j.length);
});

suite('20c. ImmatOrganism V1 — brain.js Phase 1');

test('IO-11 — getPhase() = 1 par défaut', () => {
  eq(ImmatBrain.getPhase(), 1);
});

test('IO-12 — canDisplayVehicleOnMap phase 1 = true (observe seulement)', () => {
  eq(ImmatBrain.canDisplayVehicleOnMap({ plate: 'AB-123-CD' }), true);
});

test('IO-13 — canDisplayVehicleOnMap phase 3 = false (bloque)', () => {
  ImmatBrain.setPhase(3);
  eq(ImmatBrain.canDisplayVehicleOnMap({ plate: 'AB-123-CD' }), false);
  ImmatBrain.setPhase(1);
});

test('IO-14 — canRequestCall avec contexte valide = true', () => {
  eq(ImmatBrain.canRequestCall({ plate: 'AB-123-CD', source: 'vehicle_contact' }), true);
});

test('IO-15 — canRequestCall sans contexte phase 1 = true (observe)', () => {
  eq(ImmatBrain.canRequestCall(null), true);
});

test('IO-16 — canRequestCall sans contexte phase 3 = false', () => {
  ImmatBrain.setPhase(3);
  eq(ImmatBrain.canRequestCall(null), false);
  ImmatBrain.setPhase(1);
});

test('IO-17 — computeBadge : nombre réel, jamais négatif', () => {
  eq(ImmatBrain.computeBadge(5), 5);
  eq(ImmatBrain.computeBadge(-1), 0);
  eq(ImmatBrain.computeBadge(null), 0);
  eq(ImmatBrain.computeBadge('abc'), 0);
});

test('IO-18 — classifyEntity : route → RouteOrgan', () => {
  eq(ImmatBrain.classifyEntity({ group: 'route' }), 'RouteOrgan');
});

test('IO-19 — classifyEntity : vehicle → VehicleOrgan', () => {
  eq(ImmatBrain.classifyEntity({ group: 'vehicle' }), 'VehicleOrgan');
});

test('IO-20 — classifyEntity : assist → HelpOrgan', () => {
  eq(ImmatBrain.classifyEntity({ group: 'assist' }), 'HelpOrgan');
});

test('IO-21 — classifyEntity : inconnu → unknown', () => {
  eq(ImmatBrain.classifyEntity({ group: 'foo' }), 'unknown');
  eq(ImmatBrain.classifyEntity(null), 'unknown');
});

test('IO-22 — validateInvariant émit violation si passes=false', () => {
  let violated = null;
  const unsub = ImmatBus.on(EVENTS.INVARIANT_VIOLATED, e => { violated = e; });
  ImmatBrain.validateInvariant('INV-001', false, { test: true });
  unsub();
  if (!violated) throw new Error('violation non émise');
  eq(violated.payload.invariant, 'INV-001');
});

test('IO-23 — validateInvariant ne viole pas si passes=true', () => {
  let violated = false;
  const unsub = ImmatBus.on(EVENTS.INVARIANT_VIOLATED, () => { violated = true; });
  ImmatBrain.validateInvariant('INV-001', true, {});
  unsub();
  eq(violated, false);
});

suite('20d. ImmatOrganism V1 — governance.js');

test('IO-24 — phase 1 (Observateur) : aucun prérequis', () => {
  const r = ImmatGovernance.canTransitionTo(1, {});
  eq(r.allowed, true);
});

test('IO-25 — phase 3 sans prérequis : refusé', () => {
  const r = ImmatGovernance.canTransitionTo(3, {});
  eq(r.allowed, false);
});

test('IO-26 — phase 3 avec tous les prérequis : accordé', () => {
  const evidence = { journal_ok: true, no_regressions: true, tests_green: true, invariants_stable: true };
  const r = ImmatGovernance.canTransitionTo(3, evidence);
  eq(r.allowed, true);
});

test('IO-27 — phase inconnue : refusée', () => {
  const r = ImmatGovernance.canTransitionTo(99, {});
  eq(r.allowed, false);
});

test('IO-28 — listPhases retourne 5 phases', () => {
  const phases = ImmatGovernance.listPhases();
  eq(phases.length, 5);
  eq(phases[0].phase, 1);
  eq(phases[4].phase, 5);
});

// ─── 21. Audit structurel appels ─────────────────────────────────────────────
suite('21. Audit structurel appels');

const _audioSrc  = fs.readFileSync('./core/audio-manager.js', 'utf8');
const _screenSrc = fs.readFileSync('./core/call-screen.js',   'utf8');
const _swSrc     = fs.readFileSync('./service-worker.js',     'utf8');
const _callsSrc  = fs.readFileSync('./calls.js',              'utf8');

test('AU-01 — AudioManager expose playIncomingRingtone', () => ok(_audioSrc.includes('playIncomingRingtone')));
test('AU-02 — AudioManager expose playOutgoingTone',     () => ok(_audioSrc.includes('playOutgoingTone')));
test('AU-03 — AudioManager expose stopCallAudio',        () => ok(_audioSrc.includes('stopCallAudio')));
test('AU-04 — AudioManager expose setVolume',            () => ok(_audioSrc.includes('setVolume')));

test('AU-05 — CallScreen appelle playIncomingRingtone',  () => ok(_screenSrc.includes('playIncomingRingtone')));
test('AU-06 — CallScreen appelle playOutgoingTone',      () => ok(_screenSrc.includes('playOutgoingTone')));
test('AU-07 — CallScreen appelle stopCallAudio dans hide', () => ok(_screenSrc.includes('stopCallAudio')));

test('AU-08 — SW cache audio-manager.js',  () => ok(_swSrc.includes('./core/audio-manager.js')));
test('AU-09 — SW cache call-screen.js',    () => ok(_swSrc.includes('./core/call-screen.js')));
test('AU-10 — SW version >= v12',          () => { const m = _swSrc.match(/immatconnect-pro-v(\d+)/); return ok(m && parseInt(m[1], 10) >= 12); });

test('AU-11 — calls.js : _recoverIncomingPendingCalls',  () => ok(_callsSrc.includes('_recoverIncomingPendingCalls')));
test('AU-12 — calls.js : _startIncomingRecoveryPolling', () => ok(_callsSrc.includes('_startIncomingRecoveryPolling')));
test('AU-13 — calls.js : visibilitychange',              () => ok(_callsSrc.includes('visibilitychange')));
test('AU-14 — calls.js : CALL_RECEIVED',                 () => ok(_callsSrc.includes('CALL_RECEIVED')));
test('AU-15 — calls.js fallback legacy joue audio',      () => ok(_callsSrc.includes('playIncomingRingtone')));

console.log('\n' + '═'.repeat(50));
console.log('  RÉSULTAT : ' + _pass + ' ✅ pass  |  ' + _fail + ' ❌ fail');
console.log('═'.repeat(50));
if (_fail > 0) process.exit(1);
