/* core/guardian-dashboard-summary.js — intégration UI légère du Guardian Summary Engine
 *
 * Ajoute des boutons Diagnostic/Copier/Global dans le header du Dashboard Gardien.
 * Lecture seule : ne modifie pas les appels/messages/DB.
 * Aucun bloc affiché automatiquement — tout à la demande.
 */
(function(w){
  'use strict';

  var BUILD = 'guardian-dashboard-summary-v1.7';

  // Force SW update : désinstalle le SW + vide tous les caches + recharge
  w._forceSwUpdate = async function() {
    try {
      var keys = (w.caches && typeof w.caches.keys === 'function') ? await w.caches.keys() : [];
      await Promise.all(keys.map(function(k){ return w.caches.delete(k); }));
    } catch(e) {}
    try {
      if (navigator.serviceWorker) {
        var regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(function(r){ return r.unregister(); }));
      }
    } catch(e) {}
    w.location.reload();
  };
  var installed = false;
  var _lastResult = null;
  var _panelVisible = false;
  var _globalPanelVisible = false;

  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g,function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]; }); }
  function statusIcon(s){ return s === 'critical' ? '🔴' : s === 'warning' ? '🟠' : '🟢'; }
  function statusLabel(s){ return s === 'critical' ? 'Critique' : s === 'warning' ? 'Attention' : 'OK'; }
  function borderColor(s){ return s === 'critical' ? '#ef4444' : s === 'warning' ? '#f59e0b' : '#22c55e'; }

  // ── Panel Diagnostic (Guardian Summary Engine) ───────────────────
  function _panelHtml(result){
    var summary = result && result.summary || {};
    var top = summary.topDiagnosis || {};
    var lights = summary.lights || [];
    var report = result && result.report || '';
    var global = summary.globalStatus || 'warning';
    var lightsHtml = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px">'+
      lights.map(function(l){ return ''+
        '<div style="border:1px solid #252542;border-radius:10px;padding:8px;background:#0b0b18">'+
          '<div style="font-weight:700;font-size:12px;color:#e2e8f0">'+statusIcon(l.status)+' '+esc(l.area)+'</div>'+
          '<div style="font-size:10px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(l.code || l.title || '')+'</div>'+
        '</div>';
      }).join('')+
    '</div>';
    return ''+
      '<div style="border-left:3px solid '+borderColor(global)+';padding:8px 12px">'+
        '<div style="font-size:12px;font-weight:700;color:#e2e8f0;margin-bottom:4px">'+statusIcon(global)+' Santé : '+esc(statusLabel(global))+'</div>'+
        (top.title ? '<div style="font-size:11px;color:#94a3b8;margin-bottom:4px">'+esc(top.title)+'</div>' : '')+
        (top.cause ? '<div style="font-size:11px;color:#94a3b8;margin-bottom:2px"><b>Cause :</b> '+esc(top.cause)+'</div>' : '')+
        (top.action ? '<div style="font-size:11px;color:#a5b4fc;margin-bottom:4px"><b>Action :</b> '+esc(top.action)+'</div>' : '')+
        '<details style="margin-top:6px"><summary style="cursor:pointer;color:#7c6af7;font-size:11px;font-weight:600;list-style:none;padding:2px 0">▸ Voyants</summary>'+lightsHtml+'</details>'+
        '<details style="margin-top:6px"><summary style="cursor:pointer;color:#888;font-size:10px;padding:2px 0">Voir détails ingénieur</summary><pre style="white-space:pre-wrap;background:#050510;border:1px solid #222;border-radius:10px;padding:10px;color:#94a3b8;font-size:10px;max-height:220px;overflow:auto">'+esc(report)+'</pre></details>'+
      '</div>';
  }

  // ── Panel Global Check (GlobalVerificationCenter) ────────────────
  function _globalPanelHtml(result){
    var global = result.globalStatus || 'warning';
    var sections = result.sections || {};
    var issues = result.topIssues || [];
    var actions = result.recommendedActions || [];
    var report = result.report || '';

    var sectionKeys = ['app','dashboard','messages','calls','audio','webrtc','cache','supabase'];
    var sectionLabels = { app:'App', dashboard:'Dashboard', messages:'Messages', calls:'Appels', audio:'Audio', webrtc:'WebRTC/Agora', cache:'Cache/SW', supabase:'Supabase' };

    var gridHtml = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:8px">'+
      sectionKeys.map(function(k){
        var sec = sections[k] || {};
        var st = sec.status || 'unknown';
        return '<div style="border:1px solid #252542;border-radius:8px;padding:6px 8px;background:#0b0b18">'+
          '<div style="font-size:11px;font-weight:700;color:#e2e8f0">'+statusIcon(st)+' '+esc(sectionLabels[k] || k)+'</div>'+
          (sec.issues && sec.issues.length ? '<div style="font-size:9px;color:#f87171;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(sec.issues[0])+'</div>' : '<div style="font-size:9px;color:#4ade80;margin-top:2px">OK</div>')+
        '</div>';
      }).join('')+
    '</div>';

    var issuesHtml = issues.length ? issues.map(function(i){ return '<div style="font-size:10px;color:#f87171;padding:2px 0;border-bottom:1px solid #1a1a2e">'+esc(i)+'</div>'; }).join('') : '<div style="font-size:10px;color:#4ade80">Aucun problème détecté</div>';

    var actionsHtml = actions.length ? actions.map(function(a){ return '<div style="font-size:10px;color:#a5b4fc;padding:2px 0">→ '+esc(a)+'</div>'; }).join('') : '';

    var forceBtn = '<div style="margin-top:10px;padding-top:8px;border-top:1px solid #1e3a5f">'+
      '<button type="button" onclick="window._forceSwUpdate&&window._forceSwUpdate()" '+
        'style="width:100%;background:#1e40af;color:#fff;border:none;border-radius:8px;padding:10px;font-size:13px;font-weight:700;cursor:pointer">'+
        '🔄 Force Mise à Jour (désinstalle SW + vide cache)'+
      '</button>'+
    '</div>';

    return '<div style="border-left:3px solid '+borderColor(global)+';padding:8px 12px">'+
      '<div style="font-size:12px;font-weight:700;color:#e2e8f0;margin-bottom:2px">'+statusIcon(global)+' Vérification globale — '+esc(statusLabel(global))+'</div>'+
      '<div style="font-size:10px;color:#475569;margin-bottom:4px">'+esc(result.at || '')+'</div>'+
      gridHtml+
      '<details style="margin-top:8px" open><summary style="cursor:pointer;color:#f87171;font-size:11px;font-weight:600;list-style:none;padding:2px 0">▸ Problèmes ('+issues.length+')</summary>'+
        '<div style="margin-top:4px">'+issuesHtml+'</div>'+
      '</details>'+
      (actions.length ? '<details style="margin-top:6px"><summary style="cursor:pointer;color:#a5b4fc;font-size:11px;font-weight:600;list-style:none;padding:2px 0">▸ Actions</summary><div style="margin-top:4px">'+actionsHtml+'</div></details>' : '')+
      '<details style="margin-top:6px"><summary style="cursor:pointer;color:#888;font-size:10px;padding:2px 0">Rapport ingénieur complet</summary><pre style="white-space:pre-wrap;background:#050510;border:1px solid #222;border-radius:10px;padding:10px;color:#94a3b8;font-size:10px;max-height:260px;overflow:auto">'+esc(report)+'</pre></details>'+
      forceBtn+
    '</div>';
  }

  // ── DOM helpers ──────────────────────────────────────────────────
  function _findDashboardHeader(){
    var dashboard = $('gardienDashboard');
    if(!dashboard) return null;
    return dashboard.firstElementChild || null;
  }

  function _findOrCreatePanel(){
    var existing = $('guardianSummaryInlinePanel');
    if(existing) return existing;
    var dashboard = $('gardienDashboard');
    if(!dashboard) return null;
    var body = $('gardienDashboardBody');
    if(!body) return null;
    var panel = document.createElement('div');
    panel.id = 'guardianSummaryInlinePanel';
    panel.style.cssText = 'display:none;border-bottom:1px solid rgba(255,255,255,.07);background:rgba(10,10,24,.97);overflow:hidden';
    dashboard.insertBefore(panel, body);
    return panel;
  }

  function _findOrCreateGlobalPanel(){
    var existing = $('globalCheckInlinePanel');
    if(existing) return existing;
    var dashboard = $('gardienDashboard');
    if(!dashboard) return null;
    var body = $('gardienDashboardBody');
    if(!body) return null;
    var panel = document.createElement('div');
    panel.id = 'globalCheckInlinePanel';
    panel.style.cssText = 'display:none;border-bottom:1px solid rgba(255,255,255,.07);background:rgba(10,10,24,.97);overflow:hidden';
    dashboard.insertBefore(panel, body);
    return panel;
  }

  // ── Boutons header ───────────────────────────────────────────────
  function _installHeaderActions(){
    var header = _findDashboardHeader();
    if(!header) return false;
    if($('guardianSummaryHeaderActions')) return true;
    var actions = document.createElement('div');
    actions.id = 'guardianSummaryHeaderActions';
    actions.style.cssText = 'display:flex;gap:6px;align-items:center;margin-left:auto;padding-left:8px;flex-wrap:wrap';
    var btnStyle = 'background:#1e1b4b;color:#c4b5fd;border:1px solid #7c6af7;border-radius:6px;padding:10px 12px;font-weight:700;font-size:10px;cursor:pointer;min-height:44px;display:inline-flex;align-items:center';
    var globalBtnStyle = 'background:#0f2b1f;color:#4ade80;border:1px solid #22c55e;border-radius:6px;padding:10px 12px;font-weight:700;font-size:10px;cursor:pointer;min-height:44px;display:inline-flex;align-items:center';
    var majBtnStyle = 'background:#1e3a5f;color:#60a5fa;border:1px solid #3b82f6;border-radius:6px;padding:10px 12px;font-weight:700;font-size:10px;cursor:pointer;min-height:44px;display:inline-flex;align-items:center';
    actions.innerHTML = '<button id="guardianDiagToggleBtn" type="button" style="'+btnStyle+'">Diagnostic</button>'+
                        '<button id="guardianCopyReportBtn" type="button" style="'+btnStyle+'">Copier</button>'+
                        '<button id="guardianGlobalCheckBtn" type="button" style="'+globalBtnStyle+'">Global</button>'+
                        '<button type="button" onclick="window._forceSwUpdate&&window._forceSwUpdate()" style="'+majBtnStyle+'">🔄 MAJ</button>';
    header.appendChild(actions);
    return true;
  }

  function _bindButtons(){
    var diagBtn = $('guardianDiagToggleBtn');
    var copyBtn = $('guardianCopyReportBtn');
    var globalBtn = $('guardianGlobalCheckBtn');
    if(!diagBtn || !copyBtn) return;

    diagBtn.onclick = async function(){
      var panel = _findOrCreatePanel();
      if(!panel) return;
      if(_panelVisible){
        panel.style.display = 'none';
        _panelVisible = false;
        diagBtn.textContent = 'Diagnostic';
        return;
      }
      diagBtn.textContent = '…';
      if(!w.GuardianSummaryEngine || typeof w.GuardianSummaryEngine.run !== 'function'){
        console.warn('[GuardianSummary] GuardianSummaryEngine indisponible');
        diagBtn.textContent = 'Diagnostic';
        return;
      }
      try{
        var result = await w.GuardianSummaryEngine.run();
        _lastResult = result;
        w.__lastGuardianSummary = result;
        panel.innerHTML = _panelHtml(result);
        panel.style.display = 'block';
        _panelVisible = true;
        diagBtn.textContent = 'Fermer';
      }catch(e){
        diagBtn.textContent = 'Diagnostic';
      }
    };

    copyBtn.onclick = async function(){
      copyBtn.textContent = '…';
      if(!w.GuardianSummaryEngine || typeof w.GuardianSummaryEngine.run !== 'function'){
        console.warn('[GuardianSummary] GuardianSummaryEngine indisponible');
        copyBtn.textContent = 'Copier';
        return;
      }
      try{
        var result = await w.GuardianSummaryEngine.run();
        _lastResult = result;
        w.__lastGuardianSummary = result;
        var txt = result.report || '';
        try{
          await navigator.clipboard.writeText(txt);
          copyBtn.textContent = 'Copié ✓';
          setTimeout(function(){ copyBtn.textContent = 'Copier'; }, 1500);
        }catch(e){
          window.prompt && window.prompt('Copie le rapport :', txt);
          copyBtn.textContent = 'Copier';
        }
      }catch(e){
        copyBtn.textContent = 'Copier';
      }
    };

    if(globalBtn){
      globalBtn.onclick = async function(){
        var panel = _findOrCreateGlobalPanel();
        if(!panel) return;
        if(_globalPanelVisible){
          panel.style.display = 'none';
          _globalPanelVisible = false;
          globalBtn.textContent = 'Global';
          return;
        }
        globalBtn.textContent = '…';
        if(!w.GlobalVerificationCenter || typeof w.GlobalVerificationCenter.run !== 'function'){
          console.warn('[GlobalCheck] GlobalVerificationCenter indisponible');
          globalBtn.textContent = 'Global';
          return;
        }
        try{
          var result = await w.GlobalVerificationCenter.run();
          w.__lastGlobalCheck = result;
          panel.innerHTML = _globalPanelHtml(result);
          panel.style.display = 'block';
          _globalPanelVisible = true;
          globalBtn.textContent = 'Fermer';
        }catch(e){
          globalBtn.textContent = 'Global';
        }
      };
    }
  }

  async function render(){
    var old = $('guardianSummaryCard');
    if(old) old.remove();
    var oldStrip = $('guardianSummaryHeaderStrip');
    if(oldStrip) oldStrip.style.display = 'none';

    if(!$('guardienDashboard') && !$('gardienDashboard')){
      return false;
    }
    _panelVisible = false;
    _globalPanelVisible = false;
    var panel = $('guardianSummaryInlinePanel');
    if(panel) panel.style.display = 'none';
    var globalPanel = $('globalCheckInlinePanel');
    if(globalPanel) globalPanel.style.display = 'none';

    _installHeaderActions();
    _bindButtons();
    return true;
  }

  function install(){
    if(installed) return;
    installed = true;
    w.GuardianDashboardSummary = { build: BUILD, render: render };

    function patchApp(){
      if(!w.App) return false;
      if(w.App.__guardianSummaryPatch) return true;
      var oldOpen = w.App.openGardienDashboard;
      if(typeof oldOpen === 'function'){
        w.App.openGardienDashboard = function(){
          var r = oldOpen.apply(this, arguments);
          setTimeout(render, 120);
          setTimeout(render, 900);
          return r;
        };
        w.App.__guardianSummaryPatch = true;
        return true;
      }
      return false;
    }

    if(!patchApp()){
      var n = 0;
      var id = setInterval(function(){
        n++;
        if(patchApp() || n > 20) clearInterval(id);
      }, 250);
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})(window);
