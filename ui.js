/* ===== UI.JS — gestion propre des panneaux ImmatConnect ===== */
(function(){
  if(window.__ImmatConnectUIInstalledV3) return;
  window.__ImmatConnectUIInstalledV3 = true;

  function byId(id){ return document.getElementById(id); }

  function hide(el){
    if(!el) return;
    el.classList.remove("show", "open", "active");
  }

  function closeFloatingPanels(exceptId){
    [
      "reportPanel",
      "nearbyPanel",
      "alertsPanel",
      "drawer",
      "legal",
      "blocked",
      "recent",
      "vehicleContextMenu"
    ].forEach(function(id){
      if(id !== exceptId) hide(byId(id));
    });
  }

  function normalizePanelName(name){
    name = String(name || "").toLowerCase();
    if(name === "alert" || name === "alerte") return "altet";
    if(name === "contact" || name === "message" || name === "received" || name === "reçus") return "messages";
    return name;
  }

  function closeSheetPanels(exceptName){
    exceptName = normalizePanelName(exceptName);

    [
      ["altet", "Altet"],
      ["drive", "Drive"],
      ["contact", "Contact"],
      ["messages", "Messages"],
      ["settings", "Settings"]
    ].forEach(function(pair){
      const key = pair[0];
      const id = pair[1];
      const keep = key === exceptName;

      const panel = byId("panel" + id);
      const tab = byId("tab" + id);

      if(panel) panel.classList.toggle("on", keep);
      if(tab) tab.classList.toggle("on", keep);
    });
  }

  function hideSheetCompletely(){
    const sheet = byId("sheet");
    if(!sheet) return;
    sheet.dataset.uiHiddenByOverlay = "1";
    sheet.style.display = "none";
    sheet.classList.add("mini");
    sheet.classList.remove("full");
  }

  function showSheetAgain(){
    const sheet = byId("sheet");
    if(!sheet) return;
    if(sheet.dataset.uiHiddenByOverlay === "1"){
      sheet.style.display = "";
      delete sheet.dataset.uiHiddenByOverlay;
    }
  }

  function minimizeSheet(){
    const sheet = byId("sheet");
    if(!sheet) return;
    sheet.classList.add("mini");
    sheet.classList.remove("full");
  }

  function openOverlayClean(id){
    closeSheetPanels(null);
    hideSheetCompletely();
    closeFloatingPanels(id);
    const el = byId(id);
    if(el) el.classList.add("show");
  }

  function closeOverlayAndRestore(id){
    const el = byId(id);
    if(el) hide(el);
    showSheetAgain();
  }

  window.UIManager = {
    closeFloatingPanels: closeFloatingPanels,
    closeSheetPanels: closeSheetPanels,
    minimizeSheet: minimizeSheet,
    hideSheetCompletely: hideSheetCompletely,
    showSheetAgain: showSheetAgain,

    openSheetPanel: function(name){
      showSheetAgain();
      name = normalizePanelName(name);
      closeFloatingPanels(null);
      closeSheetPanels(name);
      try{ window.App && App.openSheet && App.openSheet(); }catch(e){}
    },

    openOverlay: openOverlayClean,

    closeAll: function(){
      closeFloatingPanels(null);
      closeSheetPanels(null);
      showSheetAgain();
      minimizeSheet();
    }
  };

  function installAppHooks(){
    if(!window.App){
      setTimeout(installAppHooks, 300);
      return;
    }

    if(window.__ImmatConnectUIHooksInstalledV3) return;
    window.__ImmatConnectUIHooksInstalledV3 = true;

    const originalPanel = App.panel ? App.panel.bind(App) : null;
    App.panel = function(name){
      name = normalizePanelName(name);

      showSheetAgain();
      closeFloatingPanels(null);

      if(originalPanel){
        originalPanel(name);
      }else{
        closeSheetPanels(name);
        try{ App.openSheet && App.openSheet(); }catch(e){}
      }

      if(name === "messages"){
        setTimeout(function(){
          try{
            window.ImmatMessages && ImmatMessages.refresh && ImmatMessages.refresh();
          }catch(e){}
        }, 120);
      }

      if(name === "altet"){
        setTimeout(function(){
          try{ App.renderAlerts && App.renderAlerts(); }catch(e){}
          try{ App.syncCommunityAlerts && App.syncCommunityAlerts(); }catch(e){}
        }, 120);
      }
    };

    const originalOpenReport = App.openReport ? App.openReport.bind(App) : null;
    App.openReport = function(){
      openOverlayClean("reportPanel");
      if(originalOpenReport){
        setTimeout(function(){
          const p = byId("reportPanel");
          if(p) p.classList.add("show");
          hideSheetCompletely();
        }, 10);
      }
    };

    const originalOpenNearby = App.openNearby ? App.openNearby.bind(App) : null;
    App.openNearby = function(){
      openOverlayClean("nearbyPanel");
      if(originalOpenNearby){
        originalOpenNearby();
        setTimeout(function(){
          hideSheetCompletely();
          closeSheetPanels(null);
          const p = byId("nearbyPanel");
          if(p) p.classList.add("show");
        }, 40);
      }
    };

    const originalOpenAlerts = App.openAlerts ? App.openAlerts.bind(App) : null;
    App.openAlerts = function(){
      showSheetAgain();
      closeFloatingPanels(null);
      if(originalOpenAlerts) originalOpenAlerts();
      App.panel("altet");
    };

    const originalOpenDrawer = App.openDrawer ? App.openDrawer.bind(App) : null;
    App.openDrawer = function(){
      hideSheetCompletely();
      closeFloatingPanels("drawer");
      if(originalOpenDrawer) originalOpenDrawer();
      else {
        const d = byId("drawer");
        if(d) d.classList.add("show");
      }
    };

    const originalCloseDrawer = App.closeDrawer ? App.closeDrawer.bind(App) : null;
    App.closeDrawer = function(){
      if(originalCloseDrawer) originalCloseDrawer();
      else hide(byId("drawer"));
      showSheetAgain();
    };

    const originalCloseOverlay = App.closeOverlay ? App.closeOverlay.bind(App) : null;
    App.closeOverlay = function(id){
      if(originalCloseOverlay) originalCloseOverlay(id);
      else closeOverlayAndRestore(id);

      const stillOpen = document.querySelector(".overlay.show,.modal.show,.drawer.show");
      if(!stillOpen) showSheetAgain();
    };

    const originalOpenInbox = App.openInboxBadge ? App.openInboxBadge.bind(App) : null;
    App.openInboxBadge = function(){
      showSheetAgain();
      closeFloatingPanels(null);
      App.panel("messages");

      try{
        window.ImmatMessages && ImmatMessages.setMode && ImmatMessages.setMode("inbox");
      }catch(e){}

      if(originalOpenInbox){
        try{ originalOpenInbox(); }catch(e){}
      }
    };

    document.addEventListener("click", function(ev){
      const btn = ev.target.closest("button");
      if(!btn) return;

      if((btn.textContent || "").trim() === "×"){
        const parent = btn.closest(".overlay,.modal,.drawer");

        if(parent){
          parent.classList.remove("show","open","active");

          setTimeout(function(){
            const stillOpen = document.querySelector(".overlay.show,.modal.show,.drawer.show");

            if(!stillOpen) showSheetAgain();
          }, 30);
        }
      }
    }, true);

    if(!document.getElementById("uiV3Badge")){
      const b = document.createElement("div");
      b.id = "uiV3Badge";
      b.textContent = "UI FIX 3";
      b.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:999999;background:#00ffb3;color:#06140f;padding:6px 10px;border-radius:999px;font:900 12px system-ui";
      document.body.appendChild(b);
    }
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", installAppHooks);
  }else{
    installAppHooks();
  }

  setTimeout(installAppHooks, 700);
  setTimeout(installAppHooks, 1800);
})();
