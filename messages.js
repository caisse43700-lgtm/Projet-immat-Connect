/* ===== MESSAGES.JS V7 PRO ===== */
(function(){
  if(window.__ImmatMessagesProV7) return;
  window.__ImmatMessagesProV7 = true;

  function $(id){ return document.getElementById(id); }

  function esc(v){
    return String(v || "").replace(/[&<>"']/g,function(m){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m];
    });
  }

  function plate(v){
    return String(v || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g,"")
      .replace(/^([A-Z]{2})([0-9]{3})([A-Z]{2})$/,"$1-$2-$3");
  }

  function shortTime(v){
    if(!v) return "";
    var d = new Date(v);
    if(isNaN(d)) return String(v || "");
    if(d.toDateString() === new Date().toDateString()){
      return d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
    }
    return d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"});
  }

  function setBadge(n){
    n = Math.max(0, Number(n) || 0);
    var b = $("topMsgBadge");
    if(b){
      b.textContent = String(n);
      b.style.display = n > 0 ? "flex" : "none";
    }
    try{
      if(window.S) S.unreadMsgCount = n;
      localStorage.setItem("ic_unread_msg_count", String(n));
    }catch(e){}
  }

  async function getUser(){
    try{
      if(!window.sb) return null;
      var r = await sb.auth.getUser();
      return r && r.data ? r.data.user : null;
    }catch(e){
      return null;
    }
  }

  async function fetchMessages(){
    if(!window.sb) return [];

    var user = await getUser();
    if(!user) return [];

    var r = await sb.from("messages")
      .select("*")
      .or("sender_id.eq." + user.id + ",receiver_id.eq." + user.id)
      .neq("status","rejected")
      .order("created_at",{ascending:true})
      .limit(300);

    if(r.error) return [];

    return (r.data || []).map(function(m){
      var sent = m.sender_id === user.id;

      return {
        id:m.id,
        plate:plate(m.target_plate || m.sender_plate || m.receiver_plate || "VEHICULE"),
        text:m.message || m.text || "",
        sent:sent,
        read:sent || m.status === "read",
        created_at:m.created_at,
        time:shortTime(m.created_at)
      };
    });
  }

  function injectCss(){
    if($("messagesProV7Css")) return;

    var s = document.createElement("style");
    s.id = "messagesProV7Css";
    s.textContent = `
      #icMessagesPro{
        background:linear-gradient(180deg,#071322,#0a1628);
        border-radius:30px;
        padding:18px 14px;
        color:#f3f8ff;
        border:1px solid rgba(148,163,184,.22);
      }

      .ic-pro-head{
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:14px;
      }

      .ic-pro-title{
        font-size:28px;
        font-weight:950;
      }

      .ic-pro-sub{
        color:#9aa8bb;
        font-size:14px;
        margin-top:4px;
      }

      .ic-pro-compose-btn{
        width:46px;
        height:46px;
        border-radius:16px;
        border:1px solid rgba(0,255,179,.4);
        background:rgba(0,255,179,.12);
        color:#00ffb3;
        font-size:22px;
        font-weight:900;
      }

      .ic-pro-tabs{
        display:grid;
        grid-template-columns:1fr 1fr 1fr;
        background:rgba(255,255,255,.06);
        border-radius:24px;
        padding:5px;
        margin:14px 0;
      }

      .ic-pro-tabs button{
        border:0;
        border-radius:20px;
        background:transparent;
        color:#aab7c8;
        font-weight:900;
        padding:12px 6px;
      }

      .ic-pro-tabs button.on{
        background:#00ffb3;
        color:#06140f;
      }

      .ic-pro-list{
        display:grid;
        gap:10px;
      }

      .ic-pro-row{
        display:grid;
        grid-template-columns:54px 1fr auto;
        gap:12px;
        align-items:center;
        padding:13px;
        border-radius:24px;
        background:rgba(255,255,255,.06);
        border:1px solid rgba(148,163,184,.22);
      }

      .ic-pro-row.unread{
        background:rgba(0,255,179,.10);
        border-color:rgba(0,255,179,.35);
      }

      .ic-pro-avatar{
        width:50px;
        height:50px;
        border-radius:18px;
        display:grid;
        place-items:center;
        background:rgba(255,255,255,.10);
        font-size:25px;
      }

      .ic-pro-plate{
        color:#00ffb3;
        font-size:20px;
        font-weight:950;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }

      .ic-pro-preview{
        color:#b6c2d1;
        font-size:14px;
        margin-top:4px;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }

      .ic-pro-dot{
        width:11px;
        height:11px;
        border-radius:50%;
        background:#0a84ff;
        display:block;
        margin-left:auto;
      }

      .ic-pro-meta{
        color:#b6c2d1;
        font-size:12px;
        text-align:right;
      }

      .ic-pro-thread{
        display:none;
      }

      .ic-pro-thread.show{
        display:block;
      }

      .ic-pro-thread-head{
        display:flex;
        justify-content:space-between;
        align-items:center;
        border-bottom:1px solid rgba(148,163,184,.2);
        padding-bottom:14px;
      }

      .ic-pro-back{
        background:transparent;
        border:0;
        color:#00ffb3;
        font-size:17px;
        font-weight:900;
      }

      .ic-pro-thread-title{
        font-size:22px;
        font-weight:950;
      }

      .ic-pro-trash{
        width:44px;
        height:44px;
        border-radius:16px;
        border:1px solid rgba(255,58,78,.35);
        background:rgba(255,58,78,.12);
        color:#ff4b5f;
        font-size:20px;
      }

      .ic-pro-body{
        max-height:360px;
        overflow:auto;
        padding:16px 2px;
        display:grid;
        gap:12px;
      }

      .ic-pro-bubble{
        max-width:80%;
        padding:12px 14px;
        border-radius:20px;
        line-height:1.35;
        font-size:15px;
      }

      .ic-pro-bubble.recv{
        justify-self:start;
        background:rgba(255,255,255,.09);
        color:#f3f8ff;
        border-bottom-left-radius:8px;
      }

      .ic-pro-bubble.sent{
        justify-self:end;
        background:#00ffb3;
        color:#06140f;
        font-weight:800;
        border-bottom-right-radius:8px;
      }

      .ic-pro-time{
        display:block;
        font-size:11px;
        opacity:.65;
        margin-top:6px;
        text-align:right;
      }

      .ic-pro-reply{
        display:grid;
        grid-template-columns:1fr 54px;
        gap:10px;
        border-top:1px solid rgba(148,163,184,.2);
        padding-top:12px;
      }

      .ic-pro-reply input{
        border:1px solid rgba(148,163,184,.25);
        background:rgba(255,255,255,.06);
        color:#fff;
        border-radius:20px;
        padding:0 14px;
        min-height:52px;
        font-size:15px;
      }

      .ic-pro-send{
        border:0;
        border-radius:18px;
        background:#00ffb3;
        color:#06140f;
        font-size:22px;
        font-weight:950;
      }

      .ic-pro-compose{
        display:grid;
        gap:12px;
      }

      .ic-pro-compose input,
      .ic-pro-compose textarea{
        width:100%;
        box-sizing:border-box;
        border:1px solid rgba(148,163,184,.25);
        background:rgba(255,255,255,.06);
        color:#fff;
        border-radius:20px;
        padding:14px;
        font-size:15px;
      }

      .ic-pro-compose textarea{
        min-height:110px;
      }

      .ic-pro-compose button{
        border:0;
        border-radius:20px;
        background:#00ffb3;
        color:#06140f;
        padding:14px;
        font-weight:950;
      }
    `;
    document.head.appendChild(s);
  }

  function buildShell(){
    var panel = $("panelMessages");
    if(!panel) return;

    panel.innerHTML = `
      <div id="icMessagesPro">
        <div id="icProInbox">
          <div class="ic-pro-head">
            <div>
              <div class="ic-pro-title">Messages</div>
              <div class="ic-pro-sub">Conversations par immatriculation</div>
            </div>
            <button class="ic-pro-compose-btn" id="icComposeBtn">✎</button>
          </div>

          <div class="ic-pro-tabs">
            <button data-mode="inbox" class="on">Reçus</button>
            <button data-mode="sent">Envoyés</button>
            <button data-mode="compose">Nouveau</button>
          </div>

          <div id="icProList" class="ic-pro-list"></div>
        </div>

        <div id="icProThread" class="ic-pro-thread">
          <div class="ic-pro-thread-head">
            <button class="ic-pro-back" id="icBackBtn">‹ Retour</button>
            <div class="ic-pro-thread-title" id="icThreadTitle">Conversation</div>
            <button class="ic-pro-trash" id="icDeleteBtn">🗑</button>
          </div>

          <div id="icThreadBody" class="ic-pro-body"></div>

          <div class="ic-pro-reply">
            <input id="icReplyText" placeholder="Votre message...">
            <button class="ic-pro-send" id="icSendReply">➤</button>
          </div>
        </div>
      </div>
    `;

    document.querySelectorAll(".ic-pro-tabs button").forEach(function(btn){
      btn.onclick = function(){
        ImmatMessages.setMode(btn.dataset.mode);
      };
    });

    $("icComposeBtn").onclick = function(){
      ImmatMessages.setMode("compose");
    };

    $("icBackBtn").onclick = function(){
      ImmatMessages.closeThread();
    };

    $("icDeleteBtn").onclick = function(){
      ImmatMessages.deleteThread();
    };

    $("icSendReply").onclick = function(){
      ImmatMessages.reply();
    };
  }

  window.ImmatMessages = {
    mode:"inbox",
    rows:[],
    plate:null,
    open:false,

    async refresh(){
      injectCss();
      if(!$("icMessagesPro")) buildShell();

      if(this.mode !== "compose"){
        this.rows = await fetchMessages();
      }

      this.render();
      this.updateBadge();
    },

    setMode(mode){
      this.mode = mode || "inbox";
      this.open = false;

      document.querySelectorAll(".ic-pro-tabs button").forEach(function(btn){
        btn.classList.toggle("on", btn.dataset.mode === ImmatMessages.mode);
      });

      this.render();

      if(this.mode !== "compose"){
        this.refresh();
      }
    },

    conversations(){
      var map = {};

      this.rows.forEach(function(m){
        if(ImmatMessages.mode === "inbox" && m.sent) return;
        if(ImmatMessages.mode === "sent" && !m.sent) return;

        var p = plate(m.plate);
        if(!map[p]){
          map[p] = {
            plate:p,
            text:"",
            time:"",
            date:0,
            unread:false
          };
        }

        map[p].text = m.text;
        map[p].time = m.time;
        map[p].date = new Date(m.created_at || 0).getTime();

        if(!m.sent && !m.read) map[p].unread = true;
      });

      return Object.values(map).sort(function(a,b){
        return b.date - a.date;
      });
    },

    render(){
      var inbox = $("icProInbox");
      var thread = $("icProThread");
      var list = $("icProList");

      if(!inbox || !thread || !list) return;

      if(this.open){
        inbox.style.display = "none";
        thread.classList.add("show");
        return;
      }

      inbox.style.display = "block";
      thread.classList.remove("show");

      if(this.mode === "compose"){
        list.innerHTML = `
          <div class="ic-pro-compose">
            <input id="icComposePlate" placeholder="Plaque destinataire">
            <textarea id="icComposeText" placeholder="Écrire un message..."></textarea>
            <button id="icSendNew">Envoyer</button>
          </div>
        `;

        $("icSendNew").onclick = function(){
          ImmatMessages.sendNew();
        };

        return;
      }

      var convs = this.conversations();

      if(!convs.length){
        list.innerHTML = `<div style="text-align:center;color:#9aa8bb;padding:30px">Aucun message.</div>`;
        return;
      }

      list.innerHTML = convs.map(function(c){
        return `
          <div class="ic-pro-row ${c.unread ? "unread" : ""}" data-plate="${esc(c.plate)}">
            <div class="ic-pro-avatar">${c.unread ? "📩" : "🚗"}</div>
            <div>
              <div class="ic-pro-plate">${esc(c.plate)}</div>
              <div class="ic-pro-preview">${esc(c.text)}</div>
            </div>
            <div class="ic-pro-meta">
              ${c.unread ? '<span class="ic-pro-dot"></span>' : ""}
              <div>${esc(c.time)}</div>
              <div style="font-size:20px">›</div>
            </div>
          </div>
        `;
      }).join("");

      list.querySelectorAll(".ic-pro-row").forEach(function(row){
        row.onclick = function(){
          ImmatMessages.openThread(row.dataset.plate);
        };
      });
    },

    async openThread(p){
      this.plate = plate(p);
      this.open = true;

      var title = $("icThreadTitle");
      var body = $("icThreadBody");

      if(title) title.textContent = this.plate;

      var msgs = this.rows.filter(function(m){
        return plate(m.plate) === ImmatMessages.plate;
      });

      body.innerHTML = msgs.map(function(m){
        m.read = true;

        return `
          <div class="ic-pro-bubble ${m.sent ? "sent" : "recv"}">
            ${esc(m.text)}
            <span class="ic-pro-time">${esc(m.time)}</span>
          </div>
        `;
      }).join("");

      this.render();
      this.updateBadge();
      await this.markRead();
      this.updateBadge();
    },

    closeThread(){
      this.open = false;
      this.plate = null;
      this.render();
    },

    async markRead(){
      if(!window.sb || !this.plate) return;

      var ids = this.rows
        .filter(function(m){
          return plate(m.plate) === ImmatMessages.plate && !m.sent;
        })
        .map(function(m){ return m.id; })
        .filter(Boolean);

      if(!ids.length) return;

      try{
        await sb.from("messages")
          .update({status:"read"})
          .in("id",ids);
      }catch(e){}
    },

    async sendNew(){
      var p = plate($("icComposePlate").value);
      var text = $("icComposeText").value.trim();

      if(!p || !text){
        if(window.toast) toast("Ajoute une plaque et un message.","bad");
        return;
      }

      if(window.App && App.sendMsg){
        if($("iTarget")) $("iTarget").value = p;
        if($("iMsg")) $("iMsg").value = text;
        await App.sendMsg();
      }

      this.mode = "sent";
      await this.refresh();
    },

    reply(){
      var text = $("icReplyText").value.trim();
      if(!text || !this.plate) return;

      if($("icComposePlate")) $("icComposePlate").value = this.plate;
      if($("icComposeText")) $("icComposeText").value = text;

      this.sendNew();
    },

    async deleteThread(){
      if(!this.plate) return;
      if(!confirm("Supprimer cette conversation ?")) return;

      var ids = this.rows
        .filter(function(m){
          return plate(m.plate) === ImmatMessages.plate;
        })
        .map(function(m){ return m.id; });

      try{
        if(window.sb && ids.length){
          await sb.from("messages")
            .update({status:"rejected"})
            .in("id",ids);
        }
      }catch(e){}

      this.rows = this.rows.filter(function(m){
        return plate(m.plate) !== ImmatMessages.plate;
      });

      this.closeThread();
      this.updateBadge();
    },

    updateBadge(){
      var n = this.rows.filter(function(m){
        return !m.sent && !m.read;
      }).length;

      setBadge(n);
    }
  };

  document.addEventListener("DOMContentLoaded",function(){
    injectCss();
    buildShell();
    ImmatMessages.refresh();
  });

  setTimeout(function(){
    ImmatMessages.refresh();
  },1000);

})();
