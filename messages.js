window.ImmatMessages = {

  mode:"inbox",
  plate:null,
  rows:[],

  setMode(mode){
    this.mode = mode;

    document.querySelectorAll(".ic-msg-tabs button")
      .forEach(btn=>{
        btn.classList.toggle(
          "on",
          btn.dataset.mode === mode
        );
      });

    document.getElementById("icComposePanel")
      ?.classList.toggle(
        "show",
        mode === "compose"
      );

    this.render();
  },

  render(){

    const list = document.getElementById("icMsgList");

    if(!list) return;

    list.innerHTML = "";

    this.rows.forEach(msg=>{

      const row = document.createElement("div");

      row.className = "ic-mail-row";

      row.innerHTML = `
        <div class="ic-avatar">🚗</div>

        <div>
          <div class="ic-plate">${msg.plate}</div>
          <div class="ic-preview">${msg.text}</div>
        </div>

        <div>${msg.time}</div>
      `;

      row.onclick = ()=>{
        this.openThread(msg.plate);
      };

      list.appendChild(row);

    });

  },

  openThread(plate){

    this.plate = plate;

    const thread = document.getElementById("icThread");
    const body = document.getElementById("icThreadBody");

    thread.style.display = "block";

    body.innerHTML = "";

    this.rows
      .filter(m=>m.plate===plate)
      .forEach(m=>{

        const div = document.createElement("div");

        div.className =
          "ic-bubble " +
          (m.sent ? "sent" : "recv");

        div.innerHTML = `
          ${m.text}
        `;

        body.appendChild(div);

      });

  },

  sendNew(){

    const plate =
      document.getElementById("icComposePlate").value;

    const text =
      document.getElementById("icComposeText").value;

    if(!plate || !text) return;

    this.rows.push({
      plate,
      text,
      sent:true,
      time:"maintenant"
    });

    this.render();

  },

  reply(){

    const text =
      document.getElementById("icReplyText").value;

    if(!text || !this.plate) return;

    this.rows.push({
      plate:this.plate,
      text,
      sent:true,
      time:"maintenant"
    });

    this.openThread(this.plate);

  }

};

document.addEventListener(
  "DOMContentLoaded",
  ()=>{
    ImmatMessages.render();
  }
);
