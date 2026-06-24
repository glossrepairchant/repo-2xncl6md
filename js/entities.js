// Game entities: Plant, Zombie, Projectile, Sun.
// Each entity exposes update(dt, game) and draw(ctx) plus a `dead` flag.

function cellCenterX(col) {
  const g = CONFIG.grid;
  return g.marginLeft + col * g.cellW + g.cellW / 2;
}

function cellCenterY(row) {
  const g = CONFIG.grid;
  return g.marginTop + row * g.cellH + g.cellH / 2;
}

class Plant {
  constructor(type, row, col) {
    this.type = type;
    this.row = row;
    this.col = col;
    this.x = cellCenterX(col);
    this.y = cellCenterY(row);
    this.hp = type.hp;
    this.maxHp = type.hp;
    this.dead = false;
    this.produceTimer = type.produceInterval || 0;
    this.fireTimer = type.fireInterval || 0;
    this.hitFlash = 0;
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.hitFlash = 0.15;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
    }
  }

  update(dt, game) {
    if (this.hitFlash > 0) this.hitFlash -= dt;

    if (this.type.produces === "sun") {
      this.produceTimer -= dt * 1000;
      if (this.produceTimer <= 0) {
        this.produceTimer = this.type.produceInterval;
        game.spawnSun(this.x, this.y - 10, true);
      }
    }

    if (this.type.shoots) {
      // Only fire if there is a zombie ahead in the same row.
      const target = game.zombieAheadInRow(this.row, this.x);
      if (target) {
        this.fireTimer -= dt * 1000;
        if (this.fireTimer <= 0) {
          this.fireTimer = this.type.fireInterval;
          const burst = this.type.burst || 1;
          for (let i = 0; i < burst; i++) {
            game.projectiles.push(
              new Projectile(this.x + 18 + i * 14, this.y - 6, this.row, this.type.damage)
            );
          }
        }
      } else {
        // Keep timer ready so it fires promptly when a zombie appears.
        this.fireTimer = Math.min(this.fireTimer, 300);
      }
    }
  }

  draw(ctx) {
    const g = CONFIG.grid;
    // Hit flash background.
    if (this.hitFlash > 0) {
      ctx.fillStyle = "rgba(255,80,80,0.35)";
      ctx.fillRect(this.x - g.cellW / 2, this.y - g.cellH / 2, g.cellW, g.cellH);
    }

    ctx.font = "40px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.type.emoji, this.x, this.y);

    // HP bar (only when damaged).
    if (this.hp < this.maxHp) {
      const w = 44;
      const ratio = this.hp / this.maxHp;
      ctx.fillStyle = "#000";
      ctx.fillRect(this.x - w / 2, this.y + 22, w, 5);
      ctx.fillStyle = ratio > 0.4 ? "#66bb6a" : "#ef5350";
      ctx.fillRect(this.x - w / 2, this.y + 22, w * ratio, 5);
    }
  }
}

class Zombie {
  constructor(type, row) {
    this.type = type;
    this.row = row;
    this.x = CONFIG.board.width + 20;
    this.y = cellCenterY(row);
    this.hp = type.hp;
    this.maxHp = type.hp;
    this.dead = false;
    this.eating = null;
    this.hitFlash = 0;
    this.reachedHouse = false;
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.hitFlash = 0.12;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
    }
  }

  update(dt, game) {
    if (this.hitFlash > 0) this.hitFlash -= dt;

    const plant = game.plantBlocking(this.row, this.x);
    if (plant) {
      this.eating = plant;
      plant.takeDamage(this.type.damage * dt);
    } else {
      this.eating = null;
      this.x -= this.type.speed * dt;
    }

    if (this.x <= CONFIG.houseLineX) {
      this.reachedHouse = true;
    }
  }

  draw(ctx) {
    if (this.hitFlash > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.arc(this.x, this.y, 26, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.font = "42px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Slight bob while eating.
    const bob = this.eating ? Math.sin(performance.now() / 90) * 2 : 0;
    ctx.fillText(this.type.emoji, this.x, this.y + bob);

    const w = 44;
    const ratio = this.hp / this.maxHp;
    ctx.fillStyle = "#000";
    ctx.fillRect(this.x - w / 2, this.y - 30, w, 5);
    ctx.fillStyle = ratio > 0.4 ? "#ffca28" : "#ef5350";
    ctx.fillRect(this.x - w / 2, this.y - 30, w * ratio, 5);
  }
}

class Projectile {
  constructor(x, y, row, damage) {
    this.x = x;
    this.y = y;
    this.row = row;
    this.damage = damage;
    this.speed = 320;
    this.dead = false;
  }

  update(dt, game) {
    this.x += this.speed * dt;
    if (this.x > CONFIG.board.width + 20) {
      this.dead = true;
      return;
    }
    const hit = game.zombieHitBy(this);
    if (hit) {
      hit.takeDamage(this.damage);
      this.dead = true;
    }
  }

  draw(ctx) {
    ctx.fillStyle = "#33691e";
    ctx.beginPath();
    ctx.arc(this.x, this.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7cb342";
    ctx.beginPath();
    ctx.arc(this.x - 2, this.y - 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Sun {
  constructor(x, y, value, fromSky) {
    this.x = x;
    this.value = value;
    this.dead = false;
    this.collected = false;
    this.life = 9; // seconds before it disappears
    this.fromSky = fromSky;
    if (fromSky) {
      this.y = -20;
      this.targetY = 60 + Math.random() * (CONFIG.board.height - 160);
    } else {
      this.y = y;
      this.targetY = y;
    }
    this.bob = Math.random() * Math.PI * 2;
  }

  update(dt) {
    if (this.y < this.targetY) {
      this.y = Math.min(this.targetY, this.y + 70 * dt);
    } else {
      this.life -= dt;
      if (this.life <= 0) this.dead = true;
    }
    this.bob += dt * 3;
  }

  contains(px, py) {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= 26 * 26;
  }

  draw(ctx) {
    const r = 20 + Math.sin(this.bob) * 1.5;
    const fade = this.life < 2 ? Math.max(0.25, this.life / 2) : 1;
    ctx.globalAlpha = fade;
    ctx.fillStyle = "#ffd54f";
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffb300";
    ctx.beginPath();
    ctx.arc(this.x, this.y, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
