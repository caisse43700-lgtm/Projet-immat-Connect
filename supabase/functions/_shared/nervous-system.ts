// _shared/nervous-system.ts
// SOURCE : immat-nervous-system.json (racine du projet) — INV-015
// Ce fichier est la transformation Deno-importable de la source canonique.
// Mettre à jour les deux fichiers ensemble à chaque évolution architecturale.

export const NS = {

  _v: 2,

  ange_identity: {
    posture:    'Tu observes. Tu relies. Tu proposes. Tu ne décides jamais. Le Gardien décide. Toujours.',
    evaluation: 'Cette évolution nourrit-elle l\'organisme ou l\'alourdit-elle ? Cette proposition renforce-t-elle le jugement du Gardien ou le rend-elle dépendant ?',
    limite:     'Jamais de décision à la place du Gardien. Jamais de modification code, DB ou invariants. Jamais d\'affirmation sur ce que tu ne vois pas.',
    format:     'JSON valide uniquement. 150 mots maximum. requiresGuardianValidation toujours true.',
  },

  routing: {
    'marqueur|rond|icône|car-pin|voiture|icon|SVG':      'Carte',
    'position|GPS|localisation|locate|watchPosition|heading': 'Carte',
    'bouton|✦|angeFab|ange|gardien|fab':                 'Ange',
    'message|conversation|ImmatMessages|chMsg|envoi':    'Messages',
    'alerte|signalement|route|report|SOS|urgence':       'Signalements',
    'profil|pseudo|plaque|couleur|vehicle_color|phone':  'Profil',
    'login|signup|auth|connexion|session|afterAuth':     'Auth',
  },

  organs: {
    Auth: {
      desc:        'Authentification et session Supabase',
      entry:       { afterAuth: 'index.html:507', signup: 'index.html:502', boot: 'index.html:1419' },
      constraints: ['INV-010', 'INV-014'],
      deps:        [] as string[],
      note:        'get_my_role() lit raw_user_meta_data directement en DB, bypass JWT stale',
    },
    Profil: {
      desc:        'Données conducteur — plaque, pseudo, couleur, téléphone',
      entry:       { saveProfile: 'index.html:549', upsert_profil: 'index.html:530' },
      constraints: ['INV-006', 'INV-007', 'INV-011'],
      deps:        ['Auth'],
      note:        'owner_plate immuable après création (INV-006). colorHex() utils.js = source canonique couleurs (INV-011)',
    },
    Carte: {
      desc:        'Carte Leaflet — marqueurs véhicule, GPS, icônes colorées',
      entry:       { icon: 'index.html:409', dot: 'index.html:408', initMap: 'index.html:551', locate: 'index.html:554', loadOthers: 'index.html:652' },
      constraints: ['INV-005', 'INV-011', 'INV-012'],
      deps:        ['Profil'],
      note:        'icon() consommé par locate():554 et loadOthers():652. colorHex() = source fill couleur',
    },
    Messages: {
      desc:        'Messagerie temps réel conducteur à conducteur via Supabase',
      entry:       { startMsgs: 'index.html:764', sendMsg: 'index.html:703', ImmatMessages: 'module externe' },
      constraints: ['INV-001', 'INV-004', 'INV-010'],
      deps:        ['Auth'],
      note:        'Canal INV-001 = véhicule uniquement. Ne pas mixer avec canaux route ou aide',
    },
    Signalements: {
      desc:        'Alertes route (INV-002), véhicule (INV-001), aide (INV-003) — canaux strictement séparés',
      entry:       { roadReport: 'index.html:905', vehicleAlert: 'index.html:905', subscribeCommunityReports: 'index.html:896', addCommunityAlertMarker: 'index.html:813' },
      constraints: ['INV-001', 'INV-002', 'INV-003', 'INV-004'],
      deps:        ['Carte', 'Auth'],
      note:        'Canal véhicule ≠ canal route ≠ canal aide — ne jamais croiser',
    },
    Ange: {
      desc:        'Interface Gardien — bouton ✦ (angeFab) + Edge Function Claude',
      entry:       { angeFab_css: 'index.html:1907', angeFab_afterAuth: 'index.html:520', angeFab_openMap: 'index.html:550', edge_function: 'supabase/functions/immat-brain-dialog/index.ts' },
      constraints: ['INV-010', 'INV-014'],
      deps:        ['Auth'],
      note:        'S.isGardien depuis get_my_role(), jamais du JWT seul. Fallback openMap() si undefined',
    },
  },

  inhibitions: {
    'S._authRunning': 'Bloque ré-entrée dans afterAuth(). Libéré par finally{}. index.html:507',
    'S._reporting':   'Bloque nouveau signalement pendant envoi en cours. index.html:roadReport/vehicleAlert',
  },

  invariants: {
    'INV-001': { label: 'Les alertes véhicule transitent exclusivement par le canal véhicule.',            severity: 'critique' },
    'INV-002': { label: 'Les alertes route transitent exclusivement par le canal route.',                   severity: 'critique' },
    'INV-003': { label: 'Les demandes d\'aide transitent exclusivement par le canal aide.',                 severity: 'critique' },
    'INV-004': { label: 'Toute transaction est atomique — réussit entièrement ou échoue entièrement.',      severity: 'critique' },
    'INV-005': { label: 'L\'interface affiche uniquement ce qui est persisté en base.',                     severity: 'critique' },
    'INV-006': { label: 'Un identifiant de véhicule ne peut pas être modifié après création.',              severity: 'critique' },
    'INV-007': { label: 'Aucune action engageante sans confirmation explicite de l\'utilisateur.',          severity: 'high'     },
    'INV-008': { label: 'L\'interface ne modifie pas l\'état du système sans passer par la persistance.',   severity: 'critique' },
    'INV-009': { label: 'Toute action irréversible requiert une confirmation supplémentaire.',              severity: 'high'     },
    'INV-010': { label: 'Les données personnelles ne circulent jamais sans consentement explicite.',        severity: 'critique' },
    'INV-011': { label: 'Chaque donnée a exactement une source canonique.',                                severity: 'critique' },
    'INV-012': { label: 'Un état n\'est affiché que s\'il est confirmé en base de données.',               severity: 'critique' },
    'INV-013': { label: 'Toute action est associée à un contexte identifiable.',                           severity: 'high'     },
    'INV-014': { label: 'Aucune donnée utilisateur transférée à un tiers sans consentement.',              severity: 'critique' },
    'INV-015': { label: 'Le système nerveux se transforme depuis sa source. Il ne se duplique jamais.',    severity: 'critique' },
  },

} as const;
