/* ===== UI.JS — gestion propre des panneaux ImmatConnect ===== */
(function(){
  if(window.__ImmatConnectUIInstalled) return;
  window.__ImmatConnectUIInstalled = true;

  function byId(id){
    return document.getElementById(id);
  }

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

  window.UIManager = {
    closeFloatingPanels: closeFloatingPanels,
    closeSheetPanels: closeSheetPanels,

    openSheetPanel: function(name){
      name = normalizePanelName(name);
      closeFloatingPanels(null);
      closeSheetPanels(name);
      try{ window.App && App.openSheet && App.openSheet(); }catch(e){}
    },

    openOverlay: function(id){
      closeSheetPanels(null);
      closeFloatingPanels(id);
      const el = byId(id);
      if(el) el.classList.add("show");
    },

    closeAll: function(){
      closeFloatingPanels(null);
      closeSheetPanels(null);
    }
  };

  function installAppHooks(){
    if(!window.App){
      setTimeout(installAppHooks, 300);
      return;
    }
    if(window.__ImmatConnectUIHooksInstalled) return;
    window.__ImmatConnectUIHooksInstalled = true;

    const originalPanel = App.panel ? App.panel.bind(App) : null;
    App.panel = function(name){
      name = normalizePanelName(name);

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
      closeSheetPanels(null);
      closeFloatingPanels("reportPanel");
      if(originalOpenReport) originalOpenReport();
      else UIManager.openOverlay("reportPanel");
    };

    const originalOpenNearby = App.openNearby ? App.openNearby.bind(App) : null;
    App.openNearby = function(){
      closeSheetPanels(null);
      closeFloatingPanels("nearbyPanel");
      if(originalOpenNearby) originalOpenNearby();
      else UIManager.openOverlay("nearbyPanel");
    };

    const originalOpenDrawer = App.openDrawer ? App.openDrawer.bind(App) : null;
    App.openDrawer = function(){
      closeFloatingPanels("drawer");
      if(originalOpenDrawer) originalOpenDrawer();
      else {
        const d = byId("drawer");
        if(d) d.classList.add("show");
      }
    };

    const originalOpenInbox = App.openInboxBadge ? App.openInboxBadge.bind(App) : null;
    App.openInboxBadge = function(){
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
        if(parent) parent.classList.remove("show","open","active");
      }
    }, true);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", installAppHooks);
  }else{
    installAppHooks();
  }

  setTimeout(installAppHooks, 700);
  setTimeout(installAppHooks, 1800);
})();
