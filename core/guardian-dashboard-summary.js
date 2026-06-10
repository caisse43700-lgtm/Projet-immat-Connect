/* core/guardian-dashboard-summary.js — intégration UI légère du Guardian Summary Engine
 *
 * Ajoute des boutons Diagnostic/Copier dans le header du Dashboard Gardien.
 * Lecture seule : ne modifie pas les appels/messages/DB.
 * Aucun bloc affiché automatiquement — tout à la demande.
 */
(function(w){
  'use strict';

  var BUILD = 'guardian-dashboard-summary-v1.5';
  var installed = false;
  var _lastResult = null;
  var _panelVisible = false;

  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g,function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]; }); }
  function statusIcon(s){ return s === 'critical' ? '🔴' : s === 'warning' ? '🟠' : '🟢'; }
  function statusLabel(s){ return s === 'critical' ? 'Critique' : s === 'warning' ? 'Attention' : 'OK'; }
  function borderColor(s){ return s === 'critical' ? '#ef4444' : s === 'warning' ? '#f59e0b' : '#22c55e'; }

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

  function _installHeaderActions(){
    var header = _findDashboardHeader();
    if(!header) return false;
    if($('guardianSummaryHeaderActions')) return true;
    var actions = document.createElement('div');
    actions.id = 'guardianSummaryHeaderActions';
    actions.style.cssText = 'display:flex;gap:6px;align-items:center;margin-left:auto;padding-left:8px';
    var btnStyle = 'background:#1e1b4b;color:#c4b5fd;border:1px solid #7c6af7;border-radius:6px;padding:3px 8px;font-weight:700;font-size:10px;cursor:pointer';
    actions.innerHTML = '<button id="guardianDiagToggleBtn" type="button" style="'+btnStyle+'">Diagnostic</button>'+
                        '<button id="guardianCopyReportBtn" type="button" style="'+btnStyle+'">Copier</button>';
    header.appendChild(actions);
    return true;
  }

  function _bindButtons(){
    var diagBtn = $('guardianDiagToggleBtn');
    var copyBtn = $('guardianCopyReportBtn');
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
    var panel = $('guardianSummaryInlinePanel');
    if(panel) panel.style.display = 'none';

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
