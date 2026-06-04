#!/usr/bin/env node
/**
 * detect-orphan-features.js — SESSION OBD-002
 *
 * Règle NO_ORPHAN_FEATURE : toute feature détectée dans le code
 * doit être déclarée dans knowledge/features.json.
 *
 * Usage :
 *   node scripts/detect-orphan-features.js           # rapport JSON sur stdout
 *   node scripts/detect-orphan-features.js --check   # exit 1 si HIGH détectés
 *   node scripts/detect-orphan-features.js --save    # écrit reports/orphan-features-report.json
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT    = path.resolve(__dirname, '..');
const CHECK   = process.argv.includes('--check');
const SAVE    = process.argv.includes('--save');

// ── 1. Charger le registre knowledge ───────────────────────────────────────

function loadKnowledge() {
  const featuresPath = path.join(ROOT, 'knowledge', 'features.json');
  const organsPath   = path.join(ROOT, 'knowledge', 'organs.json');
  const flowPath     = path.join(ROOT, 'architecture', 'IMMAT-FLOW-INDEX.json');

  const features = JSON.parse(fs.readFileSync(featuresPath, 'utf8'));
  const organs   = JSON.parse(fs.readFileSync(organsPath, 'utf8'));

  let flows = [];
  try { flows = JSON.parse(fs.readFileSync(flowPath, 'utf8')).flows || []; } catch (_) {}

  const featureIds     = new Set(features.features.map(f => f.id));
  const featureActions = new Set(features.features.flatMap(f => f.actions || []));
  const organIds       = new Set(organs.organs.map(o => o.id));
  const flowIds        = new Set(flows.map(f => f.id));

  // Fonctions App.* référencées dans code_entry des organes (déclarées)
  const organsAppFns = new Set();
  for (const o of organs.organs) {
    const m = (o.code_entry || '').matchAll(/App\.(\w+)/g);
    for (const match of m) organsAppFns.add(match[1]);
  }

  // Panels connus depuis les features / organes
  const knownPanels = new Set([
    'altet', 'drive', 'messages', 'settings', 'activite',
    'panelAltet', 'panelDrive', 'panelMessages', 'panelSettings', 'panelActivite',
    'reportPanel', 'sosPanel', 'nearbyPanel', 'callContactModal',
    'callIncomingPopup', 'callSentBanner', 'callNotAllowedModal',
    'gardenDashboard', 'helpOverlay', 'vehicleMenu', 'contextMenu',
    'navPremium', 'gpsPanel', 'sigStep1', 'sigStep2',
    // Panels internes F-ANGE
    'angeOverlay', 'angePanel',
    // Onboarding
    'onboardingOverlay',
    // Messages internes
    'icComposePanel',
    // Calls
    'callOverlay',
    // Activité
    'actCatPanel',
    // Bandeau véhicule devant
    'frontCarBanner',
    // DAM-COMMUNICATION Phase 1
    'icSearchBar', 'icContextCard', 'callLevelSelector', 'presenceSelector', 'dndHours',
    'icThread', 'icCallLog',
  ]);

  // Événements OBD (ImmatOrganism.observe) connus
  const knownObserveEvents = new Set([
    // Calls
    'CALL_INITIATED', 'CALL_ACCEPTED', 'CALL_REFUSED', 'CALL_CANCELLED',
    'CALL_RECEIVED', 'CALL_REQUESTED',
    // Alertes / Signalements
    'ALERT_SENT', 'ALERT_RESOLVED', 'ALERT_CONFIRMED',
    'ROAD_CREATED', 'HELP_CREATED',
    'VEHICLE_MESSAGE_SENT', 'VEHICLE_MESSAGE_RECEIVED',
    // Messages
    'MSG_SENT', 'MSG_RECEIVED',
    // SOS
    'SOS_TRIGGERED', 'SOS_CANCELLED',
    // Auth / Profil
    'AUTH_OK', 'PROFILE_SAVED',
    // Carte / GPS
    'MAP_SELF_LOCATED', 'MAP_LOCATED', 'GPS_STARTED',
    // Ange
    'ANGE_QUERIED',
    // Badges
    'BADGE_RECOMPUTED',
    // Système immunitaire (OBD-002b)
    'ORPHAN_FEATURE_DETECTED', 'ORPHAN_CHAIN_DETECTED',
    'ORPHAN_INTENTION_DETECTED', 'ORPHAN_FLOW_DETECTED',
    'ORPHAN_TEST_DETECTED', 'ORPHAN_OBSERVATION_DETECTED',
    'ORPHAN_INVARIANT_DETECTED', 'ORPHAN_ORGAN_DETECTED',
    // Divers
    'REPORT_SENT', 'ASSIST_REQUESTED', 'ASSIST_RESOLVED',
    // DAM-COMMUNICATION Phase 1 — F-CONVERSATION-ENGINE
    'MSG_FAILED',
    // DAM-COMMUNICATION Phase 1 — F-CALL-PERMISSIONS
    'CALL_PREFERENCES_UPDATED', 'CALL_RINGING', 'CALL_ENDED',
    'CALL_MISSED', 'CALL_UNREACHABLE',
    // DAM-COMMUNICATION Phase 1 — F-TRUST
    'CONTACT_TRUSTED', 'CONTACT_REVOKED',
    'BLOCK_CREATED', 'BLOCK_REMOVED', 'CONTEXT_GRANTED', 'CONTEXT_EXPIRED',
    // DAM-COMMUNICATION Phase 1 — F-SPAM-PROTECTION
    'SPAM_DETECTED',
    // DAM-COMMUNICATION Phase 1 — F-FAVORITES / F-ARCHIVE / F-SEARCH
    'CONV_FAVORITED', 'CONV_ARCHIVED', 'CONV_SEARCHED',
    // DAM-COMMUNICATION Phase 1 — F-PRESENCE
    'PRESENCE_CHANGED',
    // F-PROXIMITY-SIGNAL
    'PROXIMITY_SIGNAL_SENT', 'PROXIMITY_SIGNAL_RECEIVED',
    // Conversation lifecycle
    'CONV_OPENED', 'CONV_CLOSED',
    // CommunicationSelfTest
    'COMMUNICATION_SELFTEST_PASS', 'COMMUNICATION_SELFTEST_FAIL',
  ]);

  // Edge Functions déclarées
  const knownEdgeFunctions = new Set([
    'immat-brain-dialog',
    'create-call-request',
    'respond-call-request',
  ]);

  // Clés localStorage ic_* connues
  const knownLocalStorageKeys = new Set([
    'deleted_msgs', 'muted', 'invisible', 'sounds', 'voice',
    'gps_favs', 'gps_hist', 'last_plate', 'last_role',
    'call_prefs', 'nearby_radius',
    'unread_msg_count', 'last_state',
    // DAM-COMMUNICATION Phase 1
    'trust', 'call_perm', 'dnd', 'dnd_from', 'dnd_to',
    'archived', 'favorites', 'spam_log', 'presence',
  ]);

  return {
    featureIds,
    featureActions,
    organIds,
    flowIds,
    organsAppFns,
    knownPanels,
    knownObserveEvents,
    knownEdgeFunctions,
    knownLocalStorageKeys,
  };
}

// ── 2. Fonctions App.* utilitaires (whitelist) ──────────────────────────────

const UTILITY_APP_FUNCTIONS = new Set([
  // Utilitaires génériques
  'show', 'hide', 'panel', 'closeOverlay', 'toast', 'esc', 'formatDate',
  // Navigation
  'navActivite', 'openMap', 'goMap',
  // Auth / session
  'afterAuth', 'logout', 'getSession', 'getRole',
  // Badges
  'updateActBadge', 'renderActivityFeed',
  // Cache / offline
  'clearOfflineCache', 'forceSyncAlerts',
  // Préférences
  'toggleSounds', 'toggleVoice', 'toggleInvisible', 'saveProfile',
  // Carte
  'initMap', 'locate', 'loadOthers', 'startWatch', 'stopWatch',
  'setRadius', 'centerMap', 'resetMap',
  // Messages
  'startMsgs', 'actOpenConv',
  // Signalements
  'roadReport', 'vehicleAlert', 'subscribeCommunityReports',
  'actConfirmAlert', 'actResolveAlert',
  // SOS
  'sos', 'startSosHold', 'cancelSosHold',
  // Calls
  'callManager',
  // Garde
  'openGardenDash', 'closeGardenDash', 'loadGardenData',
  // Ange
  'openAnge', 'closeAnge',
  // GPS
  'startGps', 'stopGps', 'searchAddress', 'addGpsFav', 'clearGpsFav',
  // Réservés
  'init', 'start', 'stop', 'reset', 'refresh', 'render', 'update',
  'load', 'save', 'send', 'open', 'close', 'toggle', 'set', 'get',
  'check', 'verify', 'handle', 'on', 'off', 'emit', 'bind', 'unbind',
  'subscribe', 'unsubscribe', 'dispatch', 'register', 'unregister',
  // Auth UI
  'goAuth', 'handleAuth', 'signup', 'forgotPwd', 'resendConfirm', 'updatePwd', 'eye',
  // Navigation UI
  'navMap', 'navSignaler', 'openDrawer', 'closeDrawer', 'openSheet', 'closeSheet',
  'toggleSheet', 'recenter', 'cycleView', 'setMode', 'openLegal', 'closeLegal',
  'autoNight', 'toggleReduceEffects',
  // Carte / véhicules proches
  'openNearby', 'showFloatingCard', 'hideFloatingCard', 'contactFrontVehicle',
  'openSignalHere', 'openRecent', 'closeRecent', 'clearRecent',
  'vehicleContextAction', 'poi',
  // Profil / paramètres
  'openEditProfile', 'blockPlate', 'openBlocked', 'closeBlocked', 'unblockPlate',
  // Signalements
  'sigTab', 'sigBack', 'sigDone', 'sigStepRoute', 'sigStepVehicle', 'sigStepAide',
  'resetSignalPanel', '_sigReset', 'openReport', 'openAlerts', 'setAlertFilter',
  'dismissAlert', 'markAlertSeen', 'markAlertPending', 'cleanupAlerts',
  'respondVehicleAlert', 'vehicleAlertQuick', 'signalFeedback', 'updateCommunityStatus',
  'assist', 'pending', 'pendingGet', 'reject', 'accept',
  // Activité
  'openActivityCat', 'closeActivityCat', 'markAllCatRead', 'openInboxBadge',
  'openNotifConversation', '_actFilter', '_actModCard',
  // Messages
  'reply', 'setConv', 'deleteMessage',
  // GPS / Navigation
  'startNav', 'searchGps', 'pickDest', 'pickPlate', 'voiceGps', 'routeSaved',
  'saveCurrentDestination', 'deleteFav', 'deleteHistEntry', 'toggleVoiceGender',
  'updateNavPremium',
  // Gardien / Dashboard
  'openGardienDashboard', 'closeGardienDashboard', 'runImmunityCheck',
  // Onboarding
  'dismissOnboarding',
  // Front car
  'fcAction', '_fcCallbacks', '_fcTimer',
  // Patchs installés (marqueurs internes)
  '__ImmatConnectUIV6Patched', '__finalMessagesCompatibilityInstalled',
  '__multiAccountPatchInstalled',
  // Divers
  'cacheState', 'reconnectSafe',
]);

// Préfixes utilitaires (si le nom commence par l'un de ces préfixes)
const UTILITY_PREFIXES = [
  'act', 'fmt', 'render', 'build', 'draw', 'compute', 'calc',
  'parse', 'validate', 'sanitize', 'format', 'encode', 'decode',
  '_show', '_hide', '_render', '_build',
];

function isUtilityFn(name) {
  if (UTILITY_APP_FUNCTIONS.has(name)) return true;
  const lower = name.toLowerCase();
  return UTILITY_PREFIXES.some(p => lower.startsWith(p.toLowerCase()));
}

// ── 3. Fichiers source à scanner ─────────────────────────────────────────────

function collectSourceFiles() {
  const direct = [
    'index.html',
    'messages.js',
    'calls.js',
    'ui.js',
    'badge.js',
    'utils.js',
    'service-worker.js',
    'core/brain.js',
    'core/bus.js',
    'core/governance.js',
    'core/immatOrganism.js',
    'core/invariants.js',
  ].map(f => path.join(ROOT, f)).filter(f => fs.existsSync(f));

  // Supabase edge functions TypeScript
  const fnDir = path.join(ROOT, 'supabase', 'functions');
  const edgeFns = [];
  if (fs.existsSync(fnDir)) {
    for (const dir of fs.readdirSync(fnDir)) {
      const p = path.join(fnDir, dir);
      if (fs.statSync(p).isDirectory()) {
        const idx = path.join(p, 'index.ts');
        if (fs.existsSync(idx)) edgeFns.push(idx);
      }
    }
  }

  return [...direct, ...edgeFns];
}

// ── 4. Patterns de détection ─────────────────────────────────────────────────

const PATTERNS = {
  appFunction:        /\bApp\.([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:[=(([{]|\.)/g,
  onclickApp:         /onclick=["'][^"']*App\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,
  panelId:            /id=["']([a-zA-Z][a-zA-Z0-9]*(Panel|Overlay|Sheet|Modal|Popup|Banner)[a-zA-Z0-9]*)["']/g,
  observeEvent:       /(?:window\.ImmatOrganism\??\.observe\??\.|ImmatOrganism\.observe\s*\(\s*)['"]([A-Z][A-Z0-9_]+)['"]/g,
  edgeFunction:       /functions\.invoke\s*\(\s*['"]([a-z][a-z0-9-]*)["']/g,
  localStorageKey:    /localStorage\.setItem\s*\(\s*['"]ic_([a-z][a-z0-9_]*)["']/g,
  featureFlag:        /\/\*\s*(F-[A-Z][A-Z0-9-]*)\s*\*\//g,
};

// ── 5. Scanner ────────────────────────────────────────────────────────────────

function scanFile(filePath, knowledge) {
  const rel     = path.relative(ROOT, filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const findings = [];

  function addFinding(type, severity, symbol, reason, suggestedAction) {
    findings.push({ type: 'ORPHAN_FEATURE_DETECTED', severity, detected_in: rel, symbol, reason, suggested_action: suggestedAction, rule_id: 'NO_ORPHAN_FEATURE' });
  }

  // App.* (hors onclick inline — ceux-ci sont repris ci-dessous)
  const appFnMatches = new Set();
  let m;
  const patApp = new RegExp(PATTERNS.appFunction.source, 'g');
  while ((m = patApp.exec(content)) !== null) {
    appFnMatches.add(m[1]);
  }
  const patOnclick = new RegExp(PATTERNS.onclickApp.source, 'g');
  while ((m = patOnclick.exec(content)) !== null) {
    appFnMatches.add(m[1]);
  }

  for (const fn of appFnMatches) {
    if (isUtilityFn(fn)) continue;
    if (knowledge.organsAppFns.has(fn)) continue;
    // Fonction App.* non déclarée et non utilitaire
    addFinding(
      'UNDECLARED_APP_FUNCTION', 'medium',
      `App.${fn}`,
      `Fonction App.* détectée sans feature déclarée dans knowledge/organs.json`,
      `Ajouter App.${fn} au code_entry de l'organe concerné dans organs.json, ou déclarer une feature F-X dans features.json`
    );
  }

  // Panels / Overlays
  const patPanel = new RegExp(PATTERNS.panelId.source, 'g');
  while ((m = patPanel.exec(content)) !== null) {
    const panelId = m[1];
    if (!knowledge.knownPanels.has(panelId)) {
      addFinding(
        'UNDECLARED_PANEL', 'high',
        panelId,
        `Panel/Overlay HTML détecté (id="${panelId}") sans déclaration dans knowledge/`,
        `Ajouter ce panel dans knowledge/screens.json ou le référencer dans une feature de features.json`
      );
    }
  }

  // ImmatOrganism.observe events
  const patObs = new RegExp(PATTERNS.observeEvent.source, 'g');
  while ((m = patObs.exec(content)) !== null) {
    const evt = m[1];
    if (!knowledge.knownObserveEvents.has(evt)) {
      addFinding(
        'UNDECLARED_OBSERVE_EVENT', 'medium',
        evt,
        `Événement ImmatOrganism.observe('${evt}') non répertorié`,
        `Ajouter '${evt}' à knownObserveEvents dans le détecteur et le documenter dans architecture/`
      );
    }
  }

  // Edge Functions
  const patEdge = new RegExp(PATTERNS.edgeFunction.source, 'g');
  while ((m = patEdge.exec(content)) !== null) {
    const fn = m[1];
    if (!knowledge.knownEdgeFunctions.has(fn)) {
      addFinding(
        'UNDECLARED_EDGE_FUNCTION', 'high',
        fn,
        `Edge Function '${fn}' invoquée sans déclaration dans knowledge/`,
        `Ajouter '${fn}' à knowledge/features.json (champ edge_fn) et créer supabase/functions/${fn}/index.ts`
      );
    }
  }

  // localStorage keys
  const patLS = new RegExp(PATTERNS.localStorageKey.source, 'g');
  while ((m = patLS.exec(content)) !== null) {
    const key = m[1];
    if (!knowledge.knownLocalStorageKeys.has(key)) {
      addFinding(
        'UNDECLARED_LOCALSTORAGE_KEY', 'low',
        `ic_${key}`,
        `Clé localStorage ic_${key} non répertoriée`,
        `Ajouter 'ic_${key}' à la liste knownLocalStorageKeys du détecteur et la documenter`
      );
    }
  }

  return findings;
}

// ── 6. Main ───────────────────────────────────────────────────────────────────

function main() {
  const knowledge = loadKnowledge();
  const files     = collectSourceFiles();
  const allFindings = [];
  const scannedFiles = [];

  for (const f of files) {
    try {
      const findings = scanFile(f, knowledge);
      allFindings.push(...findings);
      scannedFiles.push(path.relative(ROOT, f));
    } catch (err) {
      allFindings.push({
        type: 'SCAN_ERROR',
        severity: 'low',
        detected_in: path.relative(ROOT, f),
        symbol: '',
        reason: `Impossible de lire le fichier : ${err.message}`,
        suggested_action: 'Vérifier le fichier',
        rule_id: 'NO_ORPHAN_FEATURE',
      });
    }
  }

  // Dédupliquer
  const seen = new Set();
  const deduped = allFindings.filter(f => {
    const key = `${f.detected_in}::${f.symbol}::${f.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Stats
  const stats = {
    high:   deduped.filter(f => f.severity === 'high').length,
    medium: deduped.filter(f => f.severity === 'medium').length,
    low:    deduped.filter(f => f.severity === 'low').length,
    total:  deduped.length,
  };

  const report = {
    _generated_at:  new Date().toISOString(),
    _rule:          'NO_ORPHAN_FEATURE',
    _session:       'OBD-002',
    _version:       1,
    scanned_files:  scannedFiles,
    stats,
    findings:       deduped,
  };

  const json = JSON.stringify(report, null, 2);

  if (SAVE) {
    const outPath = path.join(ROOT, 'reports', 'orphan-features-report.json');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, json, 'utf8');
    console.error(`[detect-orphan-features] Rapport écrit : ${outPath}`);
    console.error(`[detect-orphan-features] Stats : HIGH=${stats.high} MEDIUM=${stats.medium} LOW=${stats.low}`);
  } else {
    process.stdout.write(json + '\n');
  }

  if (CHECK && stats.high > 0) {
    console.error(`[detect-orphan-features] ÉCHEC : ${stats.high} finding(s) HIGH détectés.`);
    process.exit(1);
  }
}

main();
