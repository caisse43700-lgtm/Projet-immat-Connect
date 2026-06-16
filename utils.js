/* ===== IMMATCONNECT UTILS — Helpers partagés ===== */
(function (w) {
  'use strict';

  /* Échappement HTML */
  w.esc = s => String(s || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));

  /* Normalisation de plaque */
  w.nPlate = v => String(v || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');

  /* Formatage plaque FR : AB-123-CD */
  w.fPlate = r => {
    const s = String(r || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
    if (s.length <= 2) return s;
    if (s.length <= 5) return s.slice(0, 2) + '-' + s.slice(2);
    return s.slice(0, 2) + '-' + s.slice(2, 5) + '-' + s.slice(5);
  };

  /* Validation plaque FR */
  w.vPlate = v => /^[A-Z]{2}-\d{3}-[A-Z]{2}$/.test(w.fPlate(v));

  /* Téléphone FR */
  w.nPhone = v => String(v || '').replace(/\D/g, '');
  w.vPhone = v => /^0\d{9}$/.test(w.nPhone(v));

  /* Distance Haversine en km */
  w.km = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const x = (lat2 - lat1) * Math.PI / 180;
    const y = (lng2 - lng1) * Math.PI / 180;
    const z = Math.sin(x / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(y / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(z), Math.sqrt(1 - z));
  };

  /* Couleurs véhicule */
  const COLOR_HEX = { white: '#f5f5f5', black: '#111', gray: '#8e8e93', blue: '#2979ff', red: '#ff3b5c', green: '#00c853', yellow: '#ffb300', other: '#b388ff' };
  const COLOR_LABEL = { white: 'Blanc', black: 'Noir', gray: 'Gris', blue: 'Bleu', red: 'Rouge', green: 'Vert', yellow: 'Jaune / Orange', other: 'Autre' };
  w.colorHex = c => COLOR_HEX[c || 'other'] || '#b388ff';
  w.colorLabel = c => COLOR_LABEL[c || ''] || 'Couleur non renseignée';

  /* Surligne une recherche dans du HTML déjà échappé, sans toucher aux balises */
  w.highlightHtml = (html, query) => {
    const q = String(query || '').trim();
    if (!q) return html;
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
    return String(html || '').split(/(<[^>]+>)/g).map(seg => {
      if (seg.indexOf('<') === 0) return seg;
      return seg.replace(re, m => '<mark style="background:#fbbf24;color:#1e1b06;border-radius:3px;padding:0 1px">' + m + '</mark>');
    }).join('');
  };

  /* Type d'alerte */
  w.inferType = input => {
    const s = String(input || '').toLowerCase();
    if (s.includes('accident')) return 'accident';
    if (s.includes('bouchon')) return 'bouchon';
    if (s.includes('travaux')) return 'travaux';
    if (s.includes('controle') || s.includes('contrôle')) return 'controle';
    if (s.includes('obstacle')) return 'obstacle';
    if (s.includes('panne')) return 'panne';
    if (s.includes('carburant') || s.includes('essence')) return 'carburant';
    if (s.includes('batterie')) return 'batterie';
    if (s.includes('moteur')) return 'moteur';
    if (s.includes('incendie') || s.includes('feu') || s.includes('fumée')) return 'incendie';
    if (s.includes('perdu')) return 'perdu';
    if (s.includes('vehicule') || s.includes('véhicule') || s.includes('pneu') || s.includes('roue')) return 'vehicule';
    if (s.includes('danger')) return 'danger';
    return 'info';
  };

}(window));
