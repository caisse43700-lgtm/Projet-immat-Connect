/* ===== UI.JS — gestion propre des panneaux ImmatConnect ===== */
(function(){
  if(window.__ImmatConnectUIInstalledV4) return;
  window.__ImmatConnectUIInstalledV4 = true;

  function byId(id){ return document.getElementById(id); }

  function hide(el){
    if(!el) return;
    el.classList.remove("show","open","active");
  }

  function normalizePanelName(name){
    name = String(name || "").toLowerCase();
    if(name === "alert" || name === "alerte") return "altet";
    if(name === "contact" || name === "message" || name === "received" || name === "reçus") return "messages";
    return name;
  }

  function closeFloatingPanels(exceptId){
    ["reportPanel","nearbyPanel","alertsPanel","drawer","legal","blocked","recent","vehicleContextMenu"].forEach(function(id){
      if(id !== exceptId) hide(byId(id));
    });
  }

  function closeSheetPanels(exceptName){
    exceptName = normalizePanelName(exceptName);

    [
      ["altet","Altet"],
      ["drive","Drive"],
      ["contact","Contact"],
      ["messages","Messages"],
      ["settings","Settings"]
    ].forEach(function(pair){
      var keep = pair[0] === exceptName;
      var panel = byId("panel" + pair[1]);
      var tab = byId("tab" + pair[1]);

      if(panel) panel.classList.toggle("on", keep);
      if(tab) tab.classList.toggle("on", keep);
    });
  }

  function showSheetAgain(){
    var sheet = byId("sheet");
    if(!sheet) return;
    sheet.style.display = "";
    delete sheet.dataset.uiHiddenByOverlay;
  }

  function hideSheetCompletely(){
    var sheet = byId("sheet");
    if(!sheet) return;
    sheet.dataset.uiHiddenByOverlay = "1";
    sheet.style.display = "none";
    sheet.classList.add("mini");
    sheet.classList.remove("full");
  }

  function openMessages(){
    showSheetAgain();
    closeFloatingPanels(null);
    closeSheetPanels("messages");

    try{ App.openSheet && App.openSheet(); }catch(e){}
    try{ ImmatMessages.setMode && ImmatMessages.setMode("inbox"); }catch(e){}
    try{ ImmatMessages.refresh && ImmatMessages.refresh(); }catch(e){}
  }

  function decrementBadgeOnce(row){
    if(!row || row.dataset.badgeClicked === "1") return;
    if(!row.classList.contains("unread")) return;

    row.dataset.badgeClicked = "1";
    row.classList.remove("unread");

    try{
      var current = Number(window.S && S.unreadMsgCount || 0);
      var next = Math.max(0, current - 1);

      if(window.S) S.unreadMsgCount = next;
      localStorage.setItem("ic_unread_msg_count", String(next));

      var badge = byId("topMsgBadge");
      if(badge){
        badge.textContent = next > 99 ? "99+" : String(next);
        badge.style.display = next > 0 ? "flex" : "none";
      }
    }catch(e){}
  }

  window.UIManager = {
    closeFloatingPanels: closeFloatingPanels,
    closeSheetPanels: closeSheetPanels,
    showSheetAgain: showSheetAgain,
    hideSheetCompletely: hideSheetCompletely,
    openSheetPanel: function(name){
      name = normalizePanelName(name);
      showSheetAgain();
      closeFloatingPanels(null);
      closeSheetPanels(name);
      try{ App.openSheet && App.openSheet(); }catch(e){}
    },
    openMessages: openMessages
  };

  function installAppHooks(){
    if(!window.App){
      setTimeout(installAppHooks,300);
      return;
    }

    if(window.__ImmatConnectUIHooksInstalledV4) return;
    window.__ImmatConnectUIHooksInstalledV4 = true;

    var originalPanel = App.panel ? App.panel.bind(App) : null;

    App.panel = function(name){
      name = normalizePanelName(name);

      showSheetAgain();
      closeFloatingPanels(null);

      if(originalPanel) originalPanel(name);
      else{
        closeSheetPanels(name);
        try{ App.openSheet && App.openSheet(); }catch(e){}
      }

      if(name === "messages"){
        setTimeout(function(){
          try{ ImmatMessages.refresh && ImmatMessages.refresh(); }catch(e){}
        },120);
      }

      if(name === "altet"){
        setTimeout(function(){
          try{ App.renderAlerts && App.renderAlerts(); }catch(e){}
          try{ App.syncCommunityAlerts && App.syncCommunityAlerts(); }catch(e){}
        },120);
      }
    };

    App.openInboxBadge = function(){
      openMessages();
    };

    var originalOpenReport = App.openReport ? App.openReport.bind(App) : null;
    App.openReport = function(){
      hideSheetCompletely();
      closeFloatingPanels("reportPanel");
      var p = byId("reportPanel");
      if(p) p.classList.add("show");
      if(originalOpenReport){
        setTimeout(function(){ try{ originalOpenReport(); }catch(e){} },10);
      }
    };

    var originalOpenNearby = App.openNearby ? App.openNearby.bind(App) : null;
    App.openNearby = function(){
      hideSheetCompletely();
      closeFloatingPanels("nearbyPanel");
      var p = byId("nearbyPanel");
      if(p) p.classList.add("show");
      if(originalOpenNearby) originalOpenNearby();
    };

    App.openAlerts = function(){
      showSheetAgain();
      closeFloatingPanels(null);
      App.panel("altet");
    };

    var originalOpenDrawer = App.openDrawer ? App.openDrawer.bind(App) : null;
    App.openDrawer = function(){
      hideSheetCompletely();
      closeFloatingPanels("drawer");
      if(originalOpenDrawer) originalOpenDrawer();
      else{
        var d = byId("drawer");
        if(d) d.classList.add("show");
      }
    };

    var originalCloseDrawer = App.closeDrawer ? App.closeDrawer.bind(App) : null;
    App.closeDrawer = function(){
      if(originalCloseDrawer) originalCloseDrawer();
      else hide(byId("drawer"));
      showSheetAgain();
    };

    var originalCloseOverlay = App.closeOverlay ? App.closeOverlay.bind(App) : null;
    App.closeOverlay = function(id){
      if(originalCloseOverlay) originalCloseOverlay(id);
      else hide(byId(id));

      var stillOpen = document.querySelector(".overlay.show,.modal.show,.drawer.show");
      if(!stillOpen) showSheetAgain();
    };

    document.addEventListener("click",function(ev){
      var row = ev.target.closest(".ic-mail-row");
      if(row) decrementBadgeOnce(row);
    },true);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded",installAppHooks);
  }else{
    installAppHooks();
  }

  setTimeout(installAppHooks,700);
  setTimeout(installAppHooks,1800);
})();
