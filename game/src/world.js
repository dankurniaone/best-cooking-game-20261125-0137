// SIZZLE RUSH — world simulation. Pure logic: no DOM, no canvas here.
// The chef walks the kitchen, picks ingredients, cooks them, assembles plates
// and serves tickets before their patience runs out.

import {
  BINS, BOARD, CHEF, COUNTER, FLOOR, ING, MAX_HAND, MAX_STRIKES,
  ORDER_FIRST_DELAY, ORDER_INTERVAL, ORDER_PATIENCE, PROCESS, RECIPES,
  SERVE, SHIFT_SECONDS, STATIONS, TRASH, boardResult, recipeById,
} from './config.js';
import { mulberry32, pick } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

export const EVENT_OVER = 1;

function sameMultiset(a, b) {
  if (a.length !== b.length) return false;
  const count = new Map();
  for (const x of a) count.set(x, (count.get(x) ?? 0) + 1);
  for (const x of b) {
    const n = count.get(x) ?? 0;
    if (n === 0) return false;
    count.set(x, n - 1);
  }
  return true;
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

export class World {
  constructor(seed = 1) {
    this.seed = seed;
    this.rng = mulberry32(seed);
    this.fxRng = mulberry32(seed * 7919 + 13);
    this.best = 0;
    this.paused = false;
    this.reset();
  }

  reset() {
    this.paused = false;
    this.screen = SCREEN_TITLE;
    this.chef = { x: 640, y: 560, tx: null, ty: null, facing: 1, moving: false };
    this.hands = [];
    this.plate = [];
    this.stations = STATIONS.map((s) => ({
      ...s,
      slots: Array.from({ length: s.slots }, () => ({ ing: null, t: 0, done: false, burnt: false })),
    }));
    this.orders = [];
    this.orderTimer = ORDER_FIRST_DELAY;
    this.nextOrderId = 1;
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.strikes = 0;
    this.served = 0;
    this.tips = 0;
    this.timeLeft = SHIFT_SECONDS;
    this.elapsed = 0;
    this.particles = [];
    this.floaters = [];
    this.sounds = [];
    this.flash = null; // {x, y, text, color, t}
    this.serveReady = false;
    this.lastTickSecond = -1;
    this.shake = 0;
  }

  start() {
    this.reset();
    this.screen = SCREEN_PLAY;
  }

  // --- helpers -------------------------------------------------------------
  stationAt(kind) {
    return this.stations.find((s) => s.kind === kind);
  }

  anchorOf(thing) {
    // Where the chef stands to use something.
    return { x: thing.x + thing.w / 2, y: thing.y + thing.h + 34 };
  }

  nearestInteractable() {
    const c = this.chef;
    let best = null;
    let bestD = CHEF.interactRange;
    const consider = (obj, kind, extra) => {
      const a = this.anchorOf(obj);
      const d = Math.hypot(c.x - a.x, c.y - a.y);
      if (d < bestD) {
        bestD = d;
        best = { kind, obj, ...extra };
      }
    };
    for (const bin of BINS) consider(bin, 'bin', { ing: bin.ing });
    for (const st of this.stations) consider(st, 'station', { station: st });
    consider(COUNTER, 'counter', {});
    consider(SERVE, 'serve', {});
    consider(TRASH, 'trash', {});
    return best;
  }

  matchingOrder() {
    if (this.plate.length === 0) return null;
    return this.orders.find((o) => sameMultiset(this.plate, recipeById(o.recipeId).needs)) ?? null;
  }

  addFloater(x, y, text, color) {
    this.floaters.push({ x, y, text, color, t: 0, life: 1.4 });
  }

  spawnOrder() {
    const recipe = pick(this.rng, RECIPES);
    this.orders.push({
      id: this.nextOrderId++,
      recipeId: recipe.id,
      patience: ORDER_PATIENCE,
      max: ORDER_PATIENCE,
    });
  }

  // --- interaction ---------------------------------------------------------
  interact() {
    const target = this.nearestInteractable();
    if (!target) return;
    if (target.kind === 'bin') {
      if (this.hands.length >= MAX_HAND) {
        this.addFloater(this.chef.x, this.chef.y - 40, 'Hands full!', '#e84a4a');
        this.sounds.push('error');
        return;
      }
      this.hands.push(target.ing);
      this.sounds.push('pickup');
      this.burst(this.chef.x, this.chef.y - 20, '#f7cf4a', 6);
      return;
    }
    if (target.kind === 'station') {
      const st = target.station;
      const proc = PROCESS[st.kind];
      // Take a finished item first.
      for (const slot of st.slots) {
        if (slot.ing && slot.done && !slot.burnt) {
          if (this.hands.length >= MAX_HAND) {
            this.addFloater(this.chef.x, this.chef.y - 40, 'Hands full!', '#e84a4a');
            this.sounds.push('error');
            return;
          }
          this.hands.push(slot.ing);
          slot.ing = null; slot.t = 0; slot.done = false;
          this.sounds.push('pickup');
          return;
        }
      }
      // Clear a burnt slot.
      for (const slot of st.slots) {
        if (slot.ing && slot.burnt) {
          slot.ing = null; slot.t = 0; slot.done = false; slot.burnt = false;
          this.sounds.push('trash');
          this.addFloater(st.x + st.w / 2, st.y - 8, 'Binned!', '#b9a68d');
          return;
        }
      }
      // Place a held ingredient that this station accepts.
      const idx = this.hands.findIndex((h) => proc.accepts.includes(h));
      if (idx === -1) {
        this.addFloater(this.chef.x, this.chef.y - 40, 'Nothing to ' + proc.label.toLowerCase() + '!', '#e84a4a');
        this.sounds.push('error');
        return;
      }
      const empty = st.slots.find((s) => !s.ing);
      if (!empty) {
        this.addFloater(this.chef.x, this.chef.y - 40, 'Station full!', '#e84a4a');
        this.sounds.push('error');
        return;
      }
      const ing = this.hands.splice(idx, 1)[0];
      empty.ing = ing;
      empty.t = 0;
      empty.done = false;
      empty.burnt = false;
      this.sounds.push(st.kind === 'board' ? 'chop' : 'sizzle');
      return;
    }
    if (target.kind === 'counter') {
      if (this.hands.length === 0) {
        this.addFloater(this.chef.x, this.chef.y - 40, 'Hands empty!', '#e84a4a');
        this.sounds.push('error');
        return;
      }
      if (this.plate.length >= 4) {
        this.addFloater(this.chef.x, this.chef.y - 40, 'Plate full!', '#e84a4a');
        this.sounds.push('error');
        return;
      }
      const ing = this.hands.pop();
      this.plate.push(ing);
      this.sounds.push('place');
      return;
    }
    if (target.kind === 'serve') {
      this.serve();
      return;
    }
    if (target.kind === 'trash') {
      if (this.hands.length === 0 && this.plate.length === 0) return;
      this.hands = [];
      this.plate = [];
      this.sounds.push('trash');
      this.addFloater(this.chef.x, this.chef.y - 40, 'Cleared!', '#b9a68d');
    }
  }

  serve() {
    const order = this.matchingOrder();
    if (!order) {
      if (this.plate.length === 0) {
        this.addFloater(SERVE.x + SERVE.w / 2, SERVE.y - 10, 'Plate is empty!', '#e84a4a');
      } else {
        this.addFloater(SERVE.x + SERVE.w / 2, SERVE.y - 10, "Doesn't match any ticket!", '#e84a4a');
      }
      this.combo = 0;
      this.shake = 0.25;
      this.sounds.push('error');
      return;
    }
    const recipe = recipeById(order.recipeId);
    const tip = Math.round(60 * (order.patience / order.max));
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const mult = 1 + Math.min(this.combo - 1, 10) * 0.1;
    const gained = Math.round((recipe.base + tip) * mult);
    this.score += gained;
    this.tips += tip;
    this.served += 1;
    this.orders = this.orders.filter((o) => o.id !== order.id);
    this.plate = [];
    this.sounds.push('serve');
    this.burst(SERVE.x + SERVE.w / 2, SERVE.y + 20, '#7fc95c', 18);
    this.addFloater(SERVE.x + SERVE.w / 2, SERVE.y - 14, `+${gained}  ${recipe.name}!`, '#7fc95c');
    if (this.combo >= 3) this.addFloater(SERVE.x + SERVE.w / 2, SERVE.y - 38, `COMBO x${this.combo}!`, '#f7b731');
  }

  burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = this.fxRng() * Math.PI * 2;
      const sp = 40 + this.fxRng() * 90;
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, t: 0, life: 0.5 + this.fxRng() * 0.4, color, size: 3 + this.fxRng() * 4 });
    }
  }

  // --- main step -----------------------------------------------------------
  step(dt, input) {
    if (this.screen !== SCREEN_PLAY) return 0;
    this.sounds = [];
    this.elapsed += dt;
    this.timeLeft -= dt;

    // Shift timer.
    const secLeft = Math.ceil(this.timeLeft);
    if (secLeft !== this.lastTickSecond) {
      this.lastTickSecond = secLeft;
      if (secLeft <= 10 && secLeft > 0) this.sounds.push('tick');
    }
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.screen = SCREEN_OVER;
      this.sounds.push('over');
      return EVENT_OVER;
    }

    // Orders.
    this.orderTimer -= dt;
    if (this.orderTimer <= 0 && this.orders.length < 3) {
      this.spawnOrder();
      this.orderTimer = Math.max(8, ORDER_INTERVAL - this.elapsed / 30);
    }
    for (const o of [...this.orders]) {
      o.patience -= dt;
      if (o.patience <= 0) {
        this.orders = this.orders.filter((x) => x.id !== o.id);
        this.strikes += 1;
        this.combo = 0;
        this.sounds.push('expire');
        this.addFloater(BOARD.x + 40, BOARD.y + 30, 'Walked out! -1 ♥', '#e84a4a');
        this.shake = 0.3;
        if (this.strikes >= MAX_STRIKES) {
          this.screen = SCREEN_OVER;
          this.sounds.push('over');
          return EVENT_OVER;
        }
      }
    }

    // Cooking progress.
    for (const st of this.stations) {
      const proc = PROCESS[st.kind];
      for (const slot of st.slots) {
        if (!slot.ing || slot.done) {
          if (slot.ing && slot.done && !slot.burnt && proc.burnAfter !== Infinity) {
            slot.t += dt;
            if (slot.t > proc.burnAfter) {
              slot.burnt = true;
              this.sounds.push('burn');
              this.addFloater(st.x + st.w / 2, st.y - 8, 'Burnt!', '#e84a4a');
            }
          }
          continue;
        }
        slot.t += dt;
        if (slot.t >= proc.seconds) {
          slot.done = true;
          slot.t = 0;
          if (st.kind === 'board') slot.ing = boardResult(slot.ing);
          else if (st.kind === 'grill') slot.ing = ING.PATTY;
          else if (st.kind === 'pot') slot.ing = ING.PASTA_BOILED;
          this.sounds.push('ding');
          this.burst(st.x + st.w / 2, st.y + 10, '#f7cf4a', 8);
        }
      }
    }

    // Chef movement: keys win over click-to-move.
    const c = this.chef;
    let mx = 0;
    let my = 0;
    if (input.up) my -= 1;
    if (input.down) my += 1;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    if (mx !== 0 || my !== 0) {
      c.tx = null; c.ty = null;
      const len = Math.hypot(mx, my);
      c.x += (mx / len) * CHEF.speed * dt;
      c.y += (my / len) * CHEF.speed * dt;
      c.facing = mx !== 0 ? Math.sign(mx) : c.facing;
      c.moving = true;
    } else if (c.tx !== null && c.ty !== null) {
      const dx = c.tx - c.x;
      const dy = c.ty - c.y;
      const d = Math.hypot(dx, dy);
      if (d < 8) {
        c.tx = null; c.ty = null;
        c.moving = false;
        if (c.pendingInteract) {
          c.pendingInteract = false;
          this.interact();
        }
      } else {
        c.x += (dx / d) * CHEF.speed * dt;
        c.y += (dy / d) * CHEF.speed * dt;
        c.facing = dx !== 0 ? Math.sign(dx) : c.facing;
        c.moving = true;
      }
    } else {
      c.moving = false;
    }
    c.x = clamp(c.x, FLOOR.x + 20, FLOOR.x + FLOOR.w - 20);
    c.y = clamp(c.y, FLOOR.y + 20, FLOOR.y + FLOOR.h - 20);

    // Click: set a walk target; clicking a usable thing queues an interact on arrival.
    if (input.click) {
      const p = input.click;
      const hit = this.pickTarget(p.x, p.y);
      if (hit) {
        c.tx = hit.x;
        c.ty = hit.y;
        c.pendingInteract = true;
      } else {
        c.tx = clamp(p.x, FLOOR.x + 20, FLOOR.x + FLOOR.w - 20);
        c.ty = clamp(p.y, FLOOR.y + 20, FLOOR.y + FLOOR.h - 20);
        c.pendingInteract = false;
      }
    }
    if (input.interact) this.interact();
    if (input.serve) this.serve();
    if (input.drop && this.hands.length > 0) {
      // Drop the top hand item onto the plate when standing at the counter.
      const near = this.nearestInteractable();
      if (near && near.kind === 'counter' && this.plate.length < 4) {
        this.plate.push(this.hands.pop());
        this.sounds.push('place');
      }
    }

    this.serveReady = this.matchingOrder() !== null;

    // Particles + floaters.
    for (const p of this.particles) {
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 60 * dt;
    }
    this.particles = this.particles.filter((p) => p.t < p.life);
    for (const f of this.floaters) f.t += dt;
    this.floaters = this.floaters.filter((f) => f.t < f.life);
    if (this.shake > 0) this.shake -= dt;

    // Ambient steam from hot stations.
    if (this.fxRng() < dt * 6) {
      const hot = this.stations.filter((s) => s.slots.some((sl) => sl.ing));
      if (hot.length > 0) {
        const st = hot[Math.floor(this.fxRng() * hot.length)];
        this.particles.push({
          x: st.x + 20 + this.fxRng() * (st.w - 40), y: st.y + 6,
          vx: (this.fxRng() - 0.5) * 10, vy: -28 - this.fxRng() * 20,
          t: 0, life: 1.1, color: 'rgba(255,255,255,0.5)', size: 5 + this.fxRng() * 5,
        });
      }
    }
    return 0;
  }

  pickTarget(x, y) {
    // Returns the stand point for a clicked bin / station / counter / serve / trash.
    const inside = (r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    const nearAnchor = (r) => {
      const a = this.anchorOf(r);
      return Math.hypot(x - a.x, y - a.y) < 80;
    };
    for (const bin of BINS) if (inside(bin) || nearAnchor(bin)) return this.anchorOf(bin);
    for (const st of this.stations) if (inside(st) || nearAnchor(st)) return this.anchorOf(st);
    if (inside(COUNTER) || nearAnchor(COUNTER)) return this.anchorOf(COUNTER);
    if (inside(SERVE) || nearAnchor(SERVE)) return this.anchorOf(SERVE);
    if (inside(TRASH) || nearAnchor(TRASH)) return this.anchorOf(TRASH);
    return null;
  }
}
