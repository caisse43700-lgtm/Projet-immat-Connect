/* ===== MESSAGES.JS V5 — Boîte mail claire + badge lu au clic ===== */
(function(){
  if(window.__ImmatMessagesV5Installed) return;
  window.__ImmatMessagesV5Installed = true;

  function $(id){ return document.getElementById(id); }

  function esc(v){
    return String(v || "").replace(/[&<>"']/g, m => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[m]));
  }

  function nPlate(v){
    return String(v || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g,"")
      .replace(/^([A-Z]{2})([0-9]{3})([A-Z]{2})$/,"$1-$2-$3");
  }

  function shortTime(v){
    if(!v) return "";
    const d = new Date(v);
    if(isNaN(d)) return String(v || "");
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if(sameDay) return d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
    return d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"});
  }

  async function getMe(){
    try{
      if(!window.sb) return null;
      const r = await sb.auth.getUser();
      return r?.data?.user || null;
    }catch(e){ return null; }
  }

  async function getMyProfile(userId){
    try{
      if(!window.sb || !userId) return null;
      const r = await sb.from("profiles").select("id,owner_plate,pseudo").eq("id", userId).maybeSingle();
      return r?.data || null;
    }catch(e){ return null; }
  }

  async function profilesByIds(ids){
    try{
      ids = [...new Set((ids || []).filter(Boolean))];
      if(!window.sb || !ids.length) return {};
      const r = await sb.from("profiles").select("id,owner_plate,pseudo").in("id", ids);
      const out = {};
      (r.data || []).forEach(p => out[p.id] = p);
      return out;
    }catch(e){ return {}; }
  }

  function setTopBadge(n){
    n = Math.max(0, Number(n) || 0);

    const badge = $("topMsgBadge");
    if(badge){
      badge.textContent = n > 99 ? "99+" : String(n);
      badge.style.display = n > 0 ? "flex" : "none";
    }

    try{
      if(window.S) S.unreadMsgCount = n;
      localStorage.setItem("ic_unread_msg_count", String(n));
      if(window.App && App.updateCommunityStatus) App.updateCommunityStatus();
    }catch(e){}
  }

  function injectCss(){
    if($("messagesV5Css")) return;

    const s = document.createElement("style");
    s.id = "messagesV5Css";
    s.textContent = `
      #icMsgList{display:grid;gap:10px;margin-top:12px}
      .ic-mail-row{display:grid;grid-template-columns:54px 1fr auto;gap:12px;align-items:center;padding:13px 14px;border-radius:22px;border:1px solid rgba(148,163,184,.22);background:rgba(255,255,255,.055);color:#eef6ff;cursor:pointer}
      .ic-mail-row.unread{background:rgba(0,255,179,.10);border-color:rgba(0,255,179,.38)}
      .ic-avatar{width:48px;height:48px;border-radius:16px;display:grid;place-items:center;background:rgba(255,255,255,.10);font-size:25px}
      .ic-main{min-width:0}
      .ic-plate{font-weight:950;font-size:18px;color:#00ffb3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ic-preview{margin-top:3px;color:#aab7c8;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ic-mail-row.unread .ic-preview{color:#eef6ff;font-weight:850}
      .ic-meta{display:flex;flex-direction:column;align-items:flex-end;gap:5px;color:#9aa8bb;font-size:12px;white-space:nowrap}
      .ic-dot{width:11px;height:11px;border-radius:50%;background:#0a84ff;box-shadow:0 0 0 4px rgba(10,132,255,.14)}
      #icThread{display:none;margin-top:12px;border:1px solid rgba(148,163,184,.24);border-radius:24px;background:rgba(8,18,32,.72);overflow:hidden}
      #icThread.show{display:block!important}
      .ic-thread-head{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px;border-bottom:1px solid rgba(148,163,184,.18)}
      .ic-thread-title{font-size:20px;font-weight:950;color:#00ffb3}
      .ic-thread-sub{font-size:12px;color:#9aa8bb}
      .ic-thread-actions button{border:0;border-radius:14px;min-width:44px;height:44px;font-weight:950}
      .ic-thread-body{max-height:280px;overflow:auto;padding:14px;display:grid;gap:10px}
      .ic-bubble{max-width:86%;padding:11px 13px;border-radius:18px;font-size:14px;line-height:1.35;border:1px solid rgba(148,163,184,.18)}
      .ic-bubble.recv{justify-self:start;background:rgba(255,255,255,.08);color:#eef6ff}
      .ic-bubble.sent{justify-self:end;background:#00ffb3;color:#06140f;font-weight:800}
      .ic-time{display:block;margin-top:6px;font-size:10px;opacity:.65;text-align:right}
      .ic-empty{padding:28px 12px;text-align:center;color:#aab7c8;line-height:1.35}
    `;
    document.head.appendChild(s);
  }

  window.ImmatMessages = {
    mode: "inbox",
    plate: null,
    rows: [],

    setMode(mode){
      this.mode = mode || "inbox";

      document.querySelectorAll(".ic-msg-tabs button").forEach(btn=>{
        btn.classList.toggle("on", btn.dataset.mode === this.mode);
      });

      $("icComposePanel")?.classList.toggle("show", this.mode === "compose");

      this.closeThread();
      this.refresh();
    },

    async refresh(){
      injectCss();

      if(this.mode === "compose"){
        this.render();
        return;
      }

      await this.fetchSupabaseMessages();
      this.render();
      this.updateBadge();
    },

    async fetchSupabaseMessages(){
      if(!window.sb) return;

      const me = await getMe();
      if(!me) return;

      const myProfile = await getMyProfile(me.id);
      const myPlate = nPlate(myProfile?.owner_plate || window.S?.profile?.owner_plate || "");

      const bucket = [];

      async function q(build){
        try{
          const r = await build();
          if(!r.error && Array.isArray(r.data)) bucket.push(...r.data);
        }catch(e){}
      }

      await q(()=>sb.from("messages")
        .select("*")
        .or(`sender_id.eq.${me.id},receiver_id.eq.${me.id}`)
        .neq("status","rejected")
        .order("created_at",{ascending:true})
        .limit(250)
      );

      if(myPlate){
        await q(()=>sb.from("messages")
          .select("*")
          .eq("target_plate",myPlate)
          .neq("status","rejected")
          .order("created_at",{ascending:true})
          .limit(250)
        );
      }

      const byId = new Map();
      bucket.forEach(m => {
        if(m && m.id && !byId.has(m.id)) byId.set(m.id,m);
      });

      const data = [...byId.values()];
      const profs = await profilesByIds(data.flatMap(m=>[m.sender_id,m.receiver_id]));

      this.rows = data.map(m=>{
        const sent = m.sender_id === me.id;
        const senderPlate = nPlate(m.sender_plate || m.from_plate || profs[m.sender_id]?.owner_plate || "");
        const receiverPlate = nPlate(m.receiver_plate || m.to_plate || profs[m.receiver_id]?.owner_plate || m.target_plate || "");

        let displayPlate = sent ? receiverPlate : senderPlate;
        if(!displayPlate) displayPlate = nPlate(m.target_plate || "VEHICULE");

        const isRead = sent || m.status === "read" || m.read_at || m.seen_at;

        return {
          id: m.id,
          plate: displayPlate,
          text: m.message || m.text || "",
          sent,
          read: !!isRead,
          created_at: m.created_at,
          time: shortTime(m.created_at),
          raw: m
        };
      }).sort((a,b)=>new Date(a.created_at||0)-new Date(b.created_at||0));
    },

    conversations(){
      const map = new Map();

      this.rows.forEach(m=>{
        if(this.mode === "inbox" && m.sent) return;
        if(this.mode === "sent" && !m.sent) return;

        const p = nPlate(m.plate);
        if(!p) return;

        if(!map.has(p)){
          map.set(p, {
            plate:p,
            messages:[],
            lastText:"",
            lastTime:"",
            lastDate:0,
            unread:false
          });
        }

        const c = map.get(p);

        c.messages.push(m);
        c.lastText = m.text || "";
        c.lastTime = m.time || "";
        c.lastDate = new Date(m.created_at || 0).getTime();

        if(!m.sent && !m.read) c.unread = true;
      });

      return [...map.values()].sort((a,b)=>b.lastDate-a.lastDate);
    },

    render(){
      injectCss();

      const list = $("icMsgList");
      if(!list) return;

      if(this.mode === "compose"){
        list.innerHTML = `
          <div class="ic-empty">
            Nouveau message : choisis une plaque, écris ton texte, puis appuie sur ➤.
          </div>
        `;
        return;
      }

      const conversations = this.conversations();

      if(!conversations.length){
        list.innerHTML = `
          <div class="ic-empty">
            Aucun message.<br>
            Les conversations apparaîtront ici par immatriculation.
          </div>
        `;
        return;
      }

      list.innerHTML = "";

      conversations.forEach(c=>{
        const row = document.createElement("div");
        row.className = "ic-mail-row" + (c.unread ? " unread" : "");

        row.innerHTML = `
          <div class="ic-avatar">${c.unread ? "📩" : "🚗"}</div>

          <div class="ic-main">
            <div class="ic-plate">${esc(c.plate)}</div>
            <div class="ic-preview">${esc(c.lastText)}</div>
          </div>

          <div class="ic-meta">
            ${c.unread ? '<span class="ic-dot"></span>' : ""}
            <span>${esc(c.lastTime)}</span>
            <span style="font-size:20px">›</span>
          </div>
        `;

        row.onclick = ()=>this.openThread(c.plate);
        list.appendChild(row);
      });
    },

    async openThread(plate){
      this.plate = nPlate(plate);

      const thread = $("icThread");
      const body = $("icThreadBody");
      const title = $("icThreadTitle");

      if(!thread || !body) return;

      if(title) title.textContent = this.plate;

      thread.classList.add("show");
      thread.style.display = "block";
      body.innerHTML = "";

      const messages = this.rows.filter(m=>nPlate(m.plate) === this.plate);

      messages.forEach(m=>{
        m.read = true;

        const div = document.createElement("div");
        div.className = "ic-bubble " + (m.sent ? "sent" : "recv");

        div.innerHTML = `
          ${esc(m.text)}
          <span class="ic-time">${esc(m.time)}</span>
        `;

        body.appendChild(div);
      });

      await this.markThreadRead(this.plate);

      this.updateBadge();
      this.render();

      setTimeout(()=>{
        body.scrollTop = body.scrollHeight;
      },50);
    },

    async markThreadRead(plate){
      if(!window.sb) return;

      const me = await getMe();
      if(!me) return;

      const ids = this.rows
        .filter(m=>nPlate(m.plate) === nPlate(plate) && !m.sent)
        .map(m=>m.id)
        .filter(Boolean);

      if(!ids.length) return;

      try{
        await sb.from("messages")
          .update({ status:"read" })
          .in("id", ids)
          .eq("receiver_id", me.id);
      }catch(e){}
    },

    closeThread(){
      const thread = $("icThread");
      if(thread){
        thread.classList.remove("show");
        thread.style.display = "none";
      }
    },

    async sendNew(){
      const plateEl = $("icComposePlate");
      const textEl = $("icComposeText");

      const plate = nPlate(plateEl?.value);
      const text = String(textEl?.value || "").trim();

      if(!plate || !text){
        if(window.toast) toast("Ajoute une plaque et un message.","bad");
        return;
      }

      try{
        if(window.App && App.sendMsg){
          const oldTarget = $("iTarget")?.value || "";
          const oldMsg = $("iMsg")?.value || "";

          if($("iTarget")) $("iTarget").value = plate;
          if($("iMsg")) $("iMsg").value = text;

          await App.sendMsg();

          if($("iTarget")) $("iTarget").value = oldTarget;
          if($("iMsg")) $("iMsg").value = oldMsg;
        }else{
          throw new Error("App.sendMsg indisponible");
        }
      }catch(e){
        console.warn(e);
        if(window.toast) toast("Envoi impossible.","bad");
        return;
      }

      if(plateEl) plateEl.value = "";
      if(textEl) textEl.value = "";

      this.mode = "sent";
      this.setMode("sent");
    },

    reply(){
      const input = $("icReplyText");
      const text = String(input?.value || "").trim();

      if(!text || !this.plate) return;

      const plateEl = $("icComposePlate");
      const textEl = $("icComposeText");

      if(plateEl) plateEl.value = this.plate;
      if(textEl) textEl.value = text;

      this.sendNew();

      if(input) input.value = "";
    },

    quick(text){
      const input = $("icReplyText");
      if(input) input.value = text;
      this.reply();
    },

    async deleteThread(){
      if(!this.plate) return;

      if(!confirm("Supprimer cette conversation ?")) return;

      const ids = this.rows
        .filter(m=>nPlate(m.plate) === this.plate)
        .map(m=>m.id)
        .filter(Boolean);

      try{
        if(window.sb && ids.length){
          await sb.from("messages")
            .update({ status:"rejected" })
            .in("id", ids);
        }
      }catch(e){}

      this.rows = this.rows.filter(m=>nPlate(m.plate) !== this.plate);

      this.closeThread();
      this.render();
      this.updateBadge();

      if(window.toast) toast("Conversation supprimée.","ok");
    },

    updateBadge(){
      const unread = this.rows.filter(m=>!m.sent && !m.read).length;
      setTopBadge(unread);
    }
  };

  document.addEventListener("DOMContentLoaded", ()=>{
    injectCss();
    ImmatMessages.refresh();
  });

  setTimeout(()=>ImmatMessages.refresh(),1000);

})();
