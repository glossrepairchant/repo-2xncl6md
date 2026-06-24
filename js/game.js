// Core game engine: state, update loop, collisions, waves, rendering.
class Game {
  constructor(canvas, hooks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.hooks = hooks || {};
    this.reset();
  }

  reset() {
    this.sun = CONFIG.startingSun;
    this.plants = [];
    this.zombies = [];
    this.projectiles = [];
    this.suns = [];
    this.grid = [];
    for (let r = 0; r < CONFIG.board.rows; r++) {
      this.grid.push(new Array(CONFIG.board.cols).fill(null));
    }
    this.selectedPlantKey = null;
    this.shovelMode = false;
    this.cooldowns = {}; // plantKey -> ms remaining
    this.skySunTimer = CONFIG.skySunInterval;
    this.running = false;
    this.gameOver = false;
    this.won = false;

    this.waveIndex = -1;
    this.waveActive = false;
    this.pendingSpawns = [];
    this.waveStartDelay = 3000; // grace period before first wave
    this.interWaveTimer = 0;
    this.lastTime = 0;
  }

  start() {
    this.running = true;
    this.gameOver = false;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  // ---------- Selection / placement ----------
  selectPlant(key) {
    if (this.cooldowns[key] > 0) return;
    if (this.sun < PLANT_TYPES[key].cost) return;
    this.shovelMode = false;
    this.selectedPlantKey = this.selectedPlantKey === key ? null : key;
    this.syncUI();
  }

  toggleShovel() {
    this.shovelMode = !this.shovelMode;
    this.selectedPlantKey = null;
    this.syncUI();
  }

  cellFromPoint(px, py) {
    const g = CONFIG.grid;
    if (px < g.marginLeft || py < g.marginTop) return null;
    const col = Math.floor((px - g.marginLeft) / g.cellW);
    const row = Math.floor((py - g.marginTop) / g.cellH);
    if (row < 0 || row >= CONFIG.board.rows || col < 0 || col >= CONFIG.board.cols) {
      return null;
    }
    return { row, col };
  }

  handleClick(px, py) {
    if (!this.running || this.gameOver) return;

    // 1) Try collecting a sun first (suns float above the grid).
    for (let i = this.suns.length - 1; i >= 0; i--) {
      const s = this.suns[i];
      if (!s.dead && s.contains(px, py)) {
        this.sun += s.value;
        s.dead = true;
        this.syncUI();
        return;
      }
    }

    const cell = this.cellFromPoint(px, py);
    if (!cell) return;

    if (this.shovelMode) {
      const existing = this.grid[cell.row][cell.col];
      if (existing) {
        existing.dead = true;
        this.grid[cell.row][cell.col] = null;
      }
      this.shovelMode = false;
      this.syncUI();
      return;
    }

    if (this.selectedPlantKey) {
      this.tryPlant(this.selectedPlantKey, cell.row, cell.col);
    }
  }

  tryPlant(key, row, col) {
    const type = PLANT_TYPES[key];
    if (this.grid[row][col]) return;
    if (this.sun < type.cost) return;
    if (this.cooldowns[key] > 0) return;

    const plant = new Plant(type, row, col);
    this.grid[row][col] = plant;
    this.plants.push(plant);
    this.sun -= type.cost;
    this.cooldowns[key] = type.cooldown;
    this.selectedPlantKey = null;
    this.syncUI();
  }

  spawnSun(x, y, fromPlant) {
    this.suns.push(new Sun(x, y, CONFIG.sunValue, false));
  }

  // ---------- Queries used by entities ----------
  zombieAheadInRow(row, x) {
    let best = null;
    for (const z of this.zombies) {
      if (z.row === row && !z.dead && z.x >= x - 10) {
        if (!best || z.x < best.x) best = z;
      }
    }
    return best;
  }

  plantBlocking(row, x) {
    // Zombie's mouth is roughly at its left side.
    const mouth = x - 18;
    let candidate = null;
    for (const p of this.plants) {
      if (p.row !== row || p.dead) continue;
      const half = CONFIG.grid.cellW / 2;
      if (mouth <= p.x + half && mouth >= p.x - half) {
        if (!candidate || p.x > candidate.x) candidate = p;
      }
    }
    return candidate;
  }

  zombieHitBy(proj) {
    let best = null;
    for (const z of this.zombies) {
      if (z.row !== proj.row || z.dead) continue;
      if (Math.abs(z.x - proj.x) < 24) {
        if (!best || z.x < best.x) best = z;
      }
    }
    return best;
  }

  // ---------- Waves ----------
  spawnZombie(typeKey, row) {
    const r = row != null ? row : Math.floor(Math.random() * CONFIG.board.rows);
    this.zombies.push(new Zombie(ZOMBIE_TYPES[typeKey], r));
  }

  startNextWave() {
    this.waveIndex++;
    if (this.waveIndex >= WAVES.length) {
      // All waves dispatched; victory handled once board is clear.
      this.waveActive = false;
      return;
    }
    this.waveActive = true;
    const script = WAVES[this.waveIndex];
    this.pendingSpawns = script.map((s) => ({
      type: s.type,
      row: s.row != null ? s.row : Math.floor(Math.random() * CONFIG.board.rows),
      time: s.delay,
    }));
    this.waveTimer = 0;
    this.maxWaveTime = Math.max(...this.pendingSpawns.map((s) => s.time)) + 18000;
    this.notify(`第 ${this.waveIndex + 1} / ${WAVES.length} 波来袭！`);
  }

  updateWaves(dt) {
    const dtMs = dt * 1000;

    if (this.waveIndex < 0) {
      this.waveStartDelay -= dtMs;
      if (this.waveStartDelay <= 0) this.startNextWave();
      return;
    }

    if (this.waveActive) {
      this.waveTimer += dtMs;
      for (const spawn of this.pendingSpawns) {
        if (!spawn.done && this.waveTimer >= spawn.time) {
          spawn.done = true;
          this.spawnZombie(spawn.type, spawn.row);
        }
      }
      const allSpawned = this.pendingSpawns.every((s) => s.done);
      const cleared = this.zombies.every((z) => z.dead);
      if ((allSpawned && cleared) || this.waveTimer > this.maxWaveTime) {
        this.waveActive = false;
        this.interWaveTimer = this.waveIndex + 1 < WAVES.length ? 5000 : 0;
        if (this.waveIndex + 1 >= WAVES.length) {
          // Victory check happens in update() once zombies cleared.
        } else {
          this.notify("挺住！准备迎接下一波…");
        }
      }
    } else if (this.waveIndex + 1 < WAVES.length) {
      this.interWaveTimer -= dtMs;
      if (this.interWaveTimer <= 0) this.startNextWave();
    }
  }

  // ---------- Main loop ----------
  loop(t) {
    if (!this.running) return;
    let dt = (t - this.lastTime) / 1000;
    this.lastTime = t;
    if (dt > 0.05) dt = 0.05; // clamp to avoid huge steps after tab switch
    this.update(dt);
    this.render();
    requestAnimationFrame((nt) => this.loop(nt));
  }

  update(dt) {
    if (this.gameOver) return;

    // Cooldowns.
    for (const k in this.cooldowns) {
      if (this.cooldowns[k] > 0) {
        this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt * 1000);
      }
    }

    // Sky sun.
    this.skySunTimer -= dt * 1000;
    if (this.skySunTimer <= 0) {
      this.skySunTimer = CONFIG.skySunInterval;
      const x = 80 + Math.random() * (CONFIG.board.width - 160);
      this.suns.push(new Sun(x, 0, CONFIG.sunValue, true));
    }

    this.updateWaves(dt);

    for (const p of this.plants) p.update(dt, this);
    for (const z of this.zombies) z.update(dt, this);
    for (const pr of this.projectiles) pr.update(dt, this);
    for (const s of this.suns) s.update(dt);

    // Clear dead plants from grid.
    for (const p of this.plants) {
      if (p.dead && this.grid[p.row][p.col] === p) {
        this.grid[p.row][p.col] = null;
      }
    }

    // Lose condition.
    if (this.zombies.some((z) => z.reachedHouse)) {
      this.endGame(false);
      return;
    }

    // Cull dead entities.
    this.plants = this.plants.filter((p) => !p.dead);
    this.zombies = this.zombies.filter((z) => !z.dead);
    this.projectiles = this.projectiles.filter((p) => !p.dead);
    this.suns = this.suns.filter((s) => !s.dead);

    // Win condition: all waves dispatched and no zombies remain.
    if (
      this.waveIndex >= WAVES.length - 1 &&
      !this.waveActive &&
      this.zombies.length === 0 &&
      this.pendingSpawns.length > 0 &&
      this.pendingSpawns.every((s) => s.done)
    ) {
      this.endGame(true);
      return;
    }

    this.syncUI();
  }

  endGame(won) {
    this.gameOver = true;
    this.won = won;
    this.running = false;
    if (this.hooks.onGameOver) this.hooks.onGameOver(won);
  }

  notify(msg) {
    if (this.hooks.onStatus) this.hooks.onStatus(msg);
  }

  syncUI() {
    if (this.hooks.onUpdate) this.hooks.onUpdate(this);
  }

  // ---------- Rendering ----------
  render() {
    const ctx = this.ctx;
    const { width, height } = CONFIG.board;
    const g = CONFIG.grid;

    ctx.clearRect(0, 0, width, height);

    // Lawn checkerboard.
    for (let r = 0; r < CONFIG.board.rows; r++) {
      for (let c = 0; c < CONFIG.board.cols; c++) {
        const x = g.marginLeft + c * g.cellW;
        const y = g.marginTop + r * g.cellH;
        ctx.fillStyle = (r + c) % 2 === 0 ? "#7cb342" : "#8bc34a";
        ctx.fillRect(x, y, g.cellW, g.cellH);
      }
    }

    // House strip on the left.
    ctx.fillStyle = "#6d4c41";
    ctx.fillRect(0, 0, g.marginLeft, height);
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(0, 0, width, g.marginTop);

    // Placement preview highlight.
    if ((this.selectedPlantKey || this.shovelMode) && this.hoverCell) {
      const { row, col } = this.hoverCell;
      const x = g.marginLeft + col * g.cellW;
      const y = g.marginTop + row * g.cellH;
      ctx.fillStyle = this.shovelMode
        ? "rgba(255,112,67,0.35)"
        : "rgba(255,255,255,0.3)";
      ctx.fillRect(x, y, g.cellW, g.cellH);
    }

    // Entities (draw order: plants, projectiles, zombies, suns).
    for (const p of this.plants) p.draw(ctx);
    for (const pr of this.projectiles) pr.draw(ctx);
    for (const z of this.zombies) z.draw(ctx);
    for (const s of this.suns) s.draw(ctx);
  }
}
