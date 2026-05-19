/* ===== MESSAGES.JS — boîte de réception type mail ===== */

window.ImmatMessages = {

  mode: "inbox",
  plate: null,
  rows: [],

  normalizePlate(value){
    return String(value || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .replace(/^([A-Z]{2})(\d{3})([A-Z]{2})$/, "$1-$2-$3");
  },

  setMode(mode){
    this.mode = mode || "inbox";

    document.querySelectorAll(".ic-msg-tabs button").forEach(btn=>{
      btn.classList.toggle("on", btn.dataset.mode === this.mode);
    });

    document.getElementById("icComposePanel")?.classList.toggle(
      "show",
      this.mode === "compose"
    );

    document.getElementById("icThread")?.classList.remove("show");

    this.render();
  },

  getConversations(){
    const map = {};

    this.rows.forEach(msg=>{
      const plate = this.normalizePlate(msg.plate);
      if(!plate) return;

      if(this.mode === "inbox" && msg.sent) return;
      if(this.mode === "sent" && !msg.sent) return;

      if(!map[plate]){
        map[plate] = {
          plate,
          lastText: msg.text || "",
          lastTime: msg.time || "",
          unread: !msg.sent && !msg.read,
          messages: []
        };
      }

      map[plate].messages.push(msg);
      map[plate].lastText = msg.text || "";
      map[plate].lastTime = msg.time || "";
      if(!msg.sent && !msg.read) map[plate].unread = true;
    });

    return Object.values(map);
  },

  render(){
    const list = document.getElementById("icMsgList");
    if(!list) return;

    list.innerHTML = "";

    if(this.mode === "compose"){
      list.innerHTML = `
        <div class="ic-empty">
          Écris une plaque et un message, puis appuie sur ➤.
        </div>
      `;
      return;
    }

    const conversations = this.getConversations();

    if(!conversations.length){
      list.innerHTML = `
        <div class="ic-empty">
          Aucun message.<br>
          Les conversations apparaîtront ici par immatriculation.
        </div>
      `;
      return;
    }

    conversations.forEach(conv=>{
      const row = document.createElement("div");
      row.className = "ic-mail-row" + (conv.unread ? " unread" : "");

      row.innerHTML = `
        <div class="ic-avatar">🚗</div>

        <div class="ic-main">
          <div class="ic-plate">${conv.plate}</div>
          <div class="ic-preview">${this.escape(conv.lastText)}</div>
        </div>

        <div class="ic-meta">
          ${conv.unread ? '<div class="ic-badge">1</div>' : ""}
          <div>${conv.lastTime || ""}</div>
          <div style="font-size:18px">›</div>
        </div>
      `;

      row.onclick = ()=>{
        this.openThread(conv.plate);
      };

      list.appendChild(row);
    });
  },

  openThread(plate){
    this.plate = this.normalizePlate(plate);

    const thread = document.getElementById("icThread");
    const body = document.getElementById("icThreadBody");
    const title = document.getElementById("icThreadTitle");

    if(!thread || !body) return;

    thread.classList.add("show");
    thread.style.display = "block";

    if(title) title.textContent = this.plate;

    body.innerHTML = "";

    const messages = this.rows.filter(m=>{
      return this.normalizePlate(m.plate) === this.plate;
    });

    messages.forEach(m=>{
      m.read = true;

      const div = document.createElement("div");
      div.className = "ic-bubble " + (m.sent ? "sent" : "recv");

      div.innerHTML = `
        ${this.escape(m.text)}
        <span class="ic-time">${m.time || ""}</span>
      `;

      body.appendChild(div);
    });

    this.updateBadge();
    this.render();

    setTimeout(()=>{
      body.scrollTop = body.scrollHeight;
    }, 50);
  },

  closeThread(){
    const thread = document.getElementById("icThread");
    if(thread){
      thread.classList.remove("show");
      thread.style.display = "none";
    }
  },

  sendNew(){
    const plateInput = document.getElementById("icComposePlate");
    const textInput = document.getElementById("icComposeText");

    const plate = this.normalizePlate(plateInput?.value);
    const text = String(textInput?.value || "").trim();

    if(!plate || !text){
      if(window.toast) toast("Ajoute une plaque et un message.", "bad");
      return;
    }

    this.rows.push({
      plate,
      text,
      sent: true,
      read: true,
      time: this.now()
    });

    if(plateInput) plateInput.value = "";
    if(textInput) textInput.value = "";

    this.mode = "sent";
    this.setMode("sent");

    if(window.toast) toast("Message envoyé.", "ok");
  },

  reply(){
    const input = document.getElementById("icReplyText");
    const text = String(input?.value || "").trim();

    if(!text || !this.plate) return;

    this.rows.push({
      plate: this.plate,
      text,
      sent: true,
      read: true,
      time: this.now()
    });

    if(input) input.value = "";

    this.openThread(this.plate);
  },

  quick(text){
    const input = document.getElementById("icReplyText");
    if(input){
      input.value = text;
      this.reply();
    }
  },

  deleteThread(){
    if(!this.plate) return;

    if(!confirm("Supprimer cette conversation ?")) return;

    this.rows = this.rows.filter(m=>{
      return this.normalizePlate(m.plate) !== this.plate;
    });

    this.closeThread();
    this.render();
    this.updateBadge();

    if(window.toast) toast("Conversation supprimée.", "ok");
  },

  updateBadge(){
    const unread = this.rows.filter(m=>!m.sent && !m.read).length;
    const badge = document.getElementById("topMsgBadge");

    if(badge){
      badge.textContent = String(unread);
      badge.style.display = unread > 0 ? "flex" : "none";
    }

    try{
      if(window.S) S.unreadMsgCount = unread;
      localStorage.setItem("ic_unread_msg_count", String(unread));
    }catch(e){}
  },

  receiveTest(plate, text){
    this.rows.push({
      plate: this.normalizePlate(plate),
      text,
      sent: false,
      read: false,
      time: this.now()
    });

    this.updateBadge();
    this.render();
  },

  now(){
    return new Date().toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit"
    });
  },

  escape(value){
    return String(value || "").replace(/[&<>"']/g, m=>({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[m]));
  }

};

document.addEventListener("DOMContentLoaded", ()=>{
  ImmatMessages.render();
  ImmatMessages.updateBadge();
});
