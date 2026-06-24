// Wires the DOM (seed bar, sun counter, overlays) to the Game engine.
(function () {
  const canvas = document.getElementById("board");
  const sunAmountEl = document.getElementById("sun-amount");
  const seedBarEl = document.getElementById("seed-bar");
  const shovelBtn = document.getElementById("shovel-btn");
  const statusPill = document.getElementById("status-pill");
  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("start-btn");

  // Build seed cards from the plant catalog.
  const cardEls = {};
  Object.values(PLANT_TYPES).forEach((type) => {
    const card = document.createElement("div");
    card.className = "seed-card";
    card.dataset.key = type.key;
    card.innerHTML = `
      <div class="emoji">${type.emoji}</div>
      <div class="name">${type.name}</div>
      <div class="cost">☀${type.cost}</div>
      <div class="cooldown-mask" style="transform: scaleY(0)"></div>
    `;
    card.addEventListener("click", () => game.selectPlant(type.key));
    seedBarEl.appendChild(card);
    cardEls[type.key] = card;
  });

  function setStatus(msg) {
    statusPill.textContent = msg;
  }

  function syncUI(g) {
    sunAmountEl.textContent = Math.floor(g.sun);

    Object.values(PLANT_TYPES).forEach((type) => {
      const card = cardEls[type.key];
      const cd = g.cooldowns[type.key] || 0;
      const affordable = g.sun >= type.cost;
      const usable = cd <= 0 && affordable;

      card.classList.toggle("disabled", !usable);
      card.classList.toggle("selected", g.selectedPlantKey === type.key);

      const mask = card.querySelector(".cooldown-mask");
      const ratio = cd > 0 ? cd / type.cooldown : 0;
      mask.style.transform = `scaleY(${ratio})`;
    });

    shovelBtn.classList.toggle("active", g.shovelMode);
  }

  const game = new Game(canvas, {
    onUpdate: syncUI,
    onStatus: setStatus,
    onGameOver: (won) => {
      overlay.classList.remove("hidden");
      overlay.querySelector(".overlay-card").innerHTML = won
        ? `<h1>🎉 胜利！</h1><p>你成功守住了草坪，击退了所有僵尸！</p>
           <button id="restart-btn" class="big-btn">再玩一次</button>`
        : `<h1>💀 失败</h1><p>僵尸闯进了房子……再接再厉！</p>
           <button id="restart-btn" class="big-btn">重新开始</button>`;
      document.getElementById("restart-btn").addEventListener("click", beginGame);
    },
  });

  // Canvas coordinate mapping (canvas is CSS-scaled).
  function toCanvasCoords(evt) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return {
      x: (evt.clientX - rect.left) * sx,
      y: (evt.clientY - rect.top) * sy,
    };
  }

  canvas.addEventListener("click", (e) => {
    const { x, y } = toCanvasCoords(e);
    game.handleClick(x, y);
  });

  canvas.addEventListener("mousemove", (e) => {
    const { x, y } = toCanvasCoords(e);
    game.hoverCell = game.cellFromPoint(x, y);
  });

  canvas.addEventListener("mouseleave", () => {
    game.hoverCell = null;
  });

  shovelBtn.addEventListener("click", () => game.toggleShovel());

  function beginGame() {
    overlay.classList.add("hidden");
    game.reset();
    setStatus("准备防御！");
    game.start();
    game.syncUI();
  }

  startBtn.addEventListener("click", beginGame);

  // Initial paint so the board isn't blank behind the overlay.
  game.render();
  game.syncUI();
})();
