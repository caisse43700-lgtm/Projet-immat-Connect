/* core/guardian-dashboard-summary.js — intégration UI légère du Guardian Summary Engine
 *
 * Ajoute une synthèse lisible au Dashboard Gardien existant.
 * Lecture seule : ne modifie pas les appels/messages/DB.
 */
(function(w){
  'use strict';

  var BUILD = 'guardian-dashboard-summary-v1.2';
  var installed = false;

  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g,function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]; }); }
  function statusIcon(s){ return s === 'critical' ? '🔴' : s === 'warning' ? '🟠' : '🟢'; }
  function statusLabel(s){ return s === 'critical' ? 'Critique' : s === 'warning' ? 'Attention' : 'OK'; }
  function borderColor(s){ return s === 'critical' ? '#ef4444' : s === 'warning' ? '#f59e0b' : '#22c55e'; }

  function cardHtml(result){
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
      '<div id="guardianSummaryCard" style="margin:0 0 10px;padding:10px 12px;border-left:3px solid '+borderColor(global)+';border-radius:8px;background:#101022">'+
        '<div style="display:flex;align-items:center;gap:8px">'+
          '<div style="font-size:18px;flex-shrink:0">'+statusIcon(global)+'</div>'+
          '<div style="flex:1;min-width:0">'+
            '<div style="font-weight:700;color:#fff;font-size:13px;line-height:1.2">Santé : '+esc(statusLabel(global))+'</div>'+
            '<div style="color:#94a3b8;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(top.title || 'Diagnostic')+'</div>'+
          '</div>'+
          '<button id="guardianCopyReportBtn" type="button" style="background:#1e1b4b;color:#c4b5fd;border:1px solid #7c6af7;border-radius:8px;padding:5px 9px;font-weight:700;font-size:11px;flex-shrink:0">Copier</button>'+
        '</div>'+
        '<details style="margin-top:6px">'+
          '<summary style="cursor:pointer;color:#7c6af7;font-size:12px;font-weight:600;list-style:none;padding:2px 0">▸ Voir diagnostic</summary>'+
          '<div style="margin-top:8px;padding-top:8px;border-top:1px solid #252542">'+
            (top.cause ? '<div style="color:#94a3b8;font-size:12px;margin-bottom:4px"><b>Cause :</b> '+esc(top.cause)+'</div>' : '')+
            (top.action ? '<div style="color:#a5b4fc;font-size:12px;margin-bottom:4px"><b>Action :</b> '+esc(top.action)+'</div>' : '')+
            (top.evidence ? '<div style="color:#64748b;font-size:11px;margin-bottom:8px"><b>Preuve :</b> '+esc(top.evidence)+'</div>' : '')+
            lightsHtml+
            '<details style="margin-top:10px"><summary style="cursor:pointer;color:#888;font-size:11px;padding:2px 0">Voir détails ingénieur</summary><pre style="white-space:pre-wrap;background:#050510;border:1px solid #222;border-radius:10px;padding:10px;color:#94a3b8;font-size:10px;max-height:260px;overflow:auto">'+esc(report)+'</pre></details>'+
          '</div>'+
        '</details>'+
      '</div>';
  }

  async function render(){
    var body = $('gardienDashboardBody');
    if(!body) return false;
    if(!w.GuardianSummaryEngine || typeof w.GuardianSummaryEngine.run !== 'function'){
      body.insertAdjacentHTML('afterbegin','<div style="margin:0 0 14px;padding:12px;border:1px solid #f59e0b;border-radius:12px;background:#1f1608;color:#fbbf24">🟠 GuardianSummaryEngine indisponible</div>');
      return false;
    }
    var old = $('guardianSummaryCard');
    if(old) old.remove();
    var result = await w.GuardianSummaryEngine.run();
    body.insertAdjacentHTML('afterbegin', cardHtml(result));
    var btn = $('guardianCopyReportBtn');
    if(btn){
      btn.onclick = async function(){
        var txt = result.report || '';
        try{
          await navigator.clipboard.writeText(txt);
          btn.textContent = 'Copié ✓';
          setTimeout(function(){ btn.textContent = 'Copier rapport'; }, 1500);
        }catch(e){
          window.prompt && window.prompt('Copie le rapport :', txt);
        }
      };
    }
    w.__lastGuardianSummary = result;
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
