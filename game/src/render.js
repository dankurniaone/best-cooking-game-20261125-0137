// SIZZLE RUSH — canvas renderer. Every pixel is drawn in code: no image assets.

import {
  BINS, BOARD, CHEF, COLORS, COUNTER, FLOOR, H, ING_META, MAX_STRIKES,
  RECIPES, SERVE, STATIONS, TRASH, W, recipeById,
} from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './world.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function chip(ctx, x, y, w, h, ing, opts = {}) {
  const m = ING_META[ing];
  ctx.save();
  rr(ctx, x, y, w, h, 8);
  ctx.fillStyle = m.color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = opts.done ? '#7fc95c' : m.dark;
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.font = `bold ${Math.round(h * 0.42)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(m.glyph, x + w / 2, y + h / 2 + 1);
  if (opts.label) {
    ctx.fillStyle = COLORS.ink;
    ctx.font = `bold 11px system-ui, sans-serif`;
    ctx.fillText(opts.label, x + w / 2, y + h + 12);
  }
  ctx.restore();
}

function drawChef(ctx, world, t) {
  const c = world.chef;
  const bob = c.moving ? Math.sin(t * 14) * 2 : Math.sin(t * 3) * 1;
  ctx.save();
  ctx.translate(c.x, c.y + bob * 0.3);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 24, 24, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body / apron.
  ctx.fillStyle = '#f5ead6';
  rr(ctx, -17, -8, 34, 34, 10);
  ctx.fill();
  ctx.fillStyle = '#2f6db3';
  rr(ctx, -17, 6, 34, 20, 8);
  ctx.fill();
  // Head.
  ctx.fillStyle = '#f2c79b';
  ctx.beginPath();
  ctx.arc(0, -18, 13, 0, Math.PI * 2);
  ctx.fill();
  // Toque (chef hat).
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-8, -30, 8, 0, Math.PI * 2);
  ctx.arc(0, -34, 9, 0, Math.PI * 2);
  ctx.arc(8, -30, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-13, -32, 26, 7);
  // Eyes look the way the chef faces.
  ctx.fillStyle = '#241a12';
  ctx.beginPath();
  ctx.arc(c.facing * 3 - 4, -18, 1.8, 0, Math.PI * 2);
  ctx.arc(c.facing * 3 + 4, -18, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // Held items float above the hands.
  world.hands.forEach((ing, i) => {
    chip(ctx, -30 + i * 32, -64, 28, 28, ing);
  });
  ctx.restore();
}

function drawTicket(ctx, order, x, y, w, h) {
  const recipe = recipeById(order.recipeId);
  const frac = Math.max(0, order.patience / order.max);
  ctx.save();
  rr(ctx, x, y, w, h, 10);
  ctx.fillStyle = COLORS.panel;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = frac < 0.3 ? '#e84a4a' : '#d8c9a3';
  ctx.stroke();
  // Dish name.
  ctx.fillStyle = COLORS.ink;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(recipe.name, x + 10, y + 21);
  ctx.fillStyle = '#8a6b46';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(`$${recipe.base}`, x + w - 40, y + 21);
  // Ingredient chips: filled when the plate already holds that item.
  const needs = recipe.needs;
  needs.forEach((ing, i) => {
    chip(ctx, x + 10 + i * 40, y + 32, 34, 34, ing);
  });
  // Patience bar.
  ctx.fillStyle = '#e5d9bd';
  rr(ctx, x + 10, y + h - 20, w - 20, 10, 5);
  ctx.fill();
  ctx.fillStyle = frac > 0.5 ? '#7fc95c' : frac > 0.25 ? '#f7b731' : '#e84a4a';
  if (frac > 0) {
    rr(ctx, x + 10, y + h - 20, (w - 20) * frac, 10, 5);
    ctx.fill();
  }
  ctx.restore();
}

function drawStation(ctx, st, world) {
  ctx.save();
  rr(ctx, st.x, st.y, st.w, st.h, 10);
  ctx.fillStyle = st.color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.stroke();
  // Label.
  ctx.fillStyle = '#f5ead6';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(st.label, st.x + st.w / 2, st.y + st.h - 8);
  // Slots.
  const slotW = st.kind === 'pot' ? 76 : 76;
  st.slots.forEach((slot, i) => {
    const sx = st.x + 12 + i * (slotW + 10);
    const sy = st.y + 10;
    rr(ctx, sx, sy, slotW, 40, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();
    if (slot.ing) {
      const m = ING_META[slot.ing];
      ctx.fillStyle = slot.burnt ? '#1a1a1a' : m.color;
      ctx.beginPath();
      ctx.arc(sx + slotW / 2, sy + 20, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(m.glyph, sx + slotW / 2, sy + 21);
      // Progress ring / bar.
      const procSeconds = st.kind === 'grill' ? 5 : st.kind === 'board' ? 3 : 6;
      if (!slot.done && !slot.burnt) {
        const frac = Math.min(1, slot.t / procSeconds);
        ctx.fillStyle = '#f7b731';
        ctx.fillRect(sx + 4, sy + 40 - 6, (slotW - 8) * frac, 4);
      } else if (slot.done && !slot.burnt) {
        ctx.fillStyle = '#7fc95c';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.fillText('READY', sx + slotW / 2, sy + 40 - 10);
      } else if (slot.burnt) {
        ctx.fillStyle = '#e84a4a';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.fillText('BURNT!', sx + slotW / 2, sy + 40 - 10);
      }
    }
  });
  ctx.restore();
}

export function draw(ctx, world, t) {
  ctx.save();
  if (world.shake > 0) {
    ctx.translate((Math.random() - 0.5) * world.shake * 24, (Math.random() - 0.5) * world.shake * 24);
  }
  // Background.
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  // Wall band.
  ctx.fillStyle = COLORS.wall;
  ctx.fillRect(0, 0, W, 218);
  ctx.fillStyle = COLORS.wallTop;
  ctx.fillRect(0, 0, W, 10);
  // Wall tiles (subway tiles).
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 64) {
    ctx.strokeRect(x, 74, 64, 34);
    ctx.strokeRect(x + 32, 108, 64, 34);
    ctx.strokeRect(x, 142, 64, 34);
    ctx.strokeRect(x + 32, 176, 64, 34);
  }
  // Floor.
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(FLOOR.x, FLOOR.y, FLOOR.w, FLOOR.h);
  for (let y = FLOOR.y; y < FLOOR.y + FLOOR.h; y += 64) {
    for (let x = FLOOR.x; x < FLOOR.x + FLOOR.w; x += 64) {
      ctx.fillStyle = ((x + y) / 64) % 2 === 0 ? COLORS.floorTileA : COLORS.floorTileB;
      ctx.fillRect(x + 1, y + 1, 62, 62);
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 3;
  ctx.strokeRect(FLOOR.x, FLOOR.y, FLOOR.w, FLOOR.h);

  // Floor decor: a checkered rug in front of the assembly counter and a
  // potted herb plant in the far corner, so the open floor reads as a kitchen.
  ctx.save();
  for (let ry = 0; ry < 3; ry++) {
    for (let rx = 0; rx < 6; rx++) {
      ctx.fillStyle = (rx + ry) % 2 === 0 ? 'rgba(184,74,58,0.30)' : 'rgba(245,234,214,0.16)';
      ctx.fillRect(430 + rx * 70, 580 + ry * 42, 70, 42);
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(430, 580, 420, 126);
  // Potted plant.
  ctx.fillStyle = '#8a4a2f';
  ctx.beginPath();
  ctx.moveTo(1180, 668);
  ctx.lineTo(1224, 668);
  ctx.lineTo(1218, 700);
  ctx.lineTo(1186, 700);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#4d7d2e';
  ctx.beginPath();
  ctx.arc(1192, 652, 14, 0, Math.PI * 2);
  ctx.arc(1206, 644, 16, 0, Math.PI * 2);
  ctx.arc(1218, 654, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ---- Top bar ----
  ctx.fillStyle = '#120c08';
  ctx.fillRect(0, 0, W, 64);
  ctx.fillStyle = '#f7b731';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('🍳 SIZZLE RUSH', 18, 33);
  ctx.fillStyle = COLORS.muted;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('RUSH HOUR KITCHEN', 268, 35);
  // Shift timer.
  const secs = Math.max(0, Math.ceil(world.timeLeft));
  const mm = Math.floor(secs / 60);
  const ss = String(secs % 60).padStart(2, '0');
  ctx.fillStyle = secs <= 30 && world.screen === SCREEN_PLAY ? '#e84a4a' : COLORS.cream;
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${mm}:${ss}`, 560, 33);
  ctx.fillStyle = COLORS.muted;
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('SHIFT', 560, 56);
  // Score.
  ctx.fillStyle = COLORS.cream;
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`★ ${world.score}`, 700, 30);
  ctx.fillStyle = world.combo >= 2 ? '#f7b731' : COLORS.muted;
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(world.combo >= 2 ? `COMBO x${world.combo}` : 'no combo', 700, 52);
  // Hearts.
  for (let i = 0; i < MAX_STRIKES; i++) {
    ctx.fillStyle = i < MAX_STRIKES - world.strikes ? '#e84a4a' : 'rgba(255,255,255,0.18)';
    ctx.font = '26px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('♥', 720 + i * 30, 33);
  }

  // ---- Order board ----
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  rr(ctx, BOARD.x - 6, BOARD.y - 6, BOARD.w + 12, BOARD.h + 12, 12);
  ctx.fill();
  ctx.fillStyle = COLORS.cream;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ORDER BOARD', BOARD.x, BOARD.y - 12 + 6);
  if (world.orders.length === 0) {
    ctx.fillStyle = COLORS.muted;
    ctx.font = 'italic 15px system-ui, sans-serif';
    ctx.fillText('No tickets yet — first order is coming…', BOARD.x + 12, BOARD.y + 60);
  }
  world.orders.forEach((o, i) => {
    drawTicket(ctx, o, BOARD.x + 8 + i * 188, BOARD.y + 8, 176, BOARD.h - 16);
  });

  // ---- Menu strip (left of the board) ----
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  rr(ctx, 16, 76, 664, 132, 12);
  ctx.fill();
  ctx.fillStyle = COLORS.cream;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('MENU — match a ticket exactly, then SERVE', 30, 98);
  RECIPES.forEach((r, i) => {
    const x = 30 + i * 132;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 4, 108, 130, 76);
    ctx.clip();
    ctx.fillStyle = r.color;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(r.name, x, 122);
    ctx.fillStyle = COLORS.muted;
    ctx.font = '12px system-ui, sans-serif';
    const parts = r.needs.map((n) => ING_META[n].short).join(' + ');
    ctx.fillText(parts, x, 140);
    ctx.fillStyle = '#f7b731';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText(`$${r.base}`, x, 158);
    ctx.fillStyle = '#8a6b46';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(r.needs.length === 2 ? '2 steps' : `${r.needs.length} steps`, x, 176);
    ctx.restore();
  });

  // ---- Ingredient bins ----
  for (const bin of BINS) {
    const m = ING_META[bin.ing];
    ctx.save();
    rr(ctx, bin.x, bin.y, bin.w, bin.h, 10);
    ctx.fillStyle = '#5d3d2c';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.stroke();
    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.arc(bin.x + bin.w / 2, bin.y + 30, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(m.glyph, bin.x + bin.w / 2, bin.y + 31);
    ctx.fillStyle = COLORS.cream;
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText(bin.label, bin.x + bin.w / 2, bin.y + bin.h - 10);
    ctx.restore();
  }

  // ---- Stations ----
  for (const st of world.stations) drawStation(ctx, st, world);

  // ---- Assembly counter + plate ----
  ctx.save();
  rr(ctx, COUNTER.x, COUNTER.y, COUNTER.w, COUNTER.h, 10);
  ctx.fillStyle = '#6b4a2f';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = world.serveReady ? '#7fc95c' : 'rgba(255,255,255,0.25)';
  ctx.stroke();
  ctx.fillStyle = COLORS.cream;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(COUNTER.label, COUNTER.x + COUNTER.w / 2, COUNTER.y + 13);
  // The plate.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(COUNTER.x + COUNTER.w / 2, COUNTER.y + 50, 52, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d8c9a3';
  ctx.lineWidth = 2;
  ctx.stroke();
  world.plate.forEach((ing, i) => {
    const px = COUNTER.x + 34 + (i % 2) * 56;
    const py = COUNTER.y + 28 + Math.floor(i / 2) * 30;
    chip(ctx, px, py, 44, 24, ing);
  });
  if (world.plate.length === 0) {
    ctx.fillStyle = '#b9a68d';
    ctx.font = 'italic 12px system-ui, sans-serif';
    ctx.fillText('empty plate', COUNTER.x + COUNTER.w / 2, COUNTER.y + 52);
  }
  ctx.restore();

  // ---- Serve window ----
  ctx.save();
  const glow = world.serveReady ? 0.55 + Math.sin(t * 6) * 0.25 : 0;
  if (world.serveReady) {
    ctx.shadowColor = '#7fc95c';
    ctx.shadowBlur = 24;
  }
  rr(ctx, SERVE.x, SERVE.y, SERVE.w, SERVE.h, 10);
  ctx.fillStyle = world.serveReady ? '#3f7d2a' : '#4a5568';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2;
  ctx.strokeStyle = world.serveReady ? '#7fc95c' : 'rgba(255,255,255,0.25)';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(world.serveReady ? '✓ SERVE!' : 'SERVE', SERVE.x + SERVE.w / 2, SERVE.y + 34);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(world.serveReady ? 'dish matches a ticket' : 'or press SPACE', SERVE.x + SERVE.w / 2, SERVE.y + 58);
  ctx.fillStyle = COLORS.cream;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(SERVE.label, SERVE.x + SERVE.w / 2, SERVE.y + SERVE.h - 8);
  ctx.restore();

  // ---- Trash ----
  ctx.save();
  rr(ctx, TRASH.x, TRASH.y, TRASH.w, TRASH.h, 10);
  ctx.fillStyle = '#3a3f4a';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = COLORS.cream;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🗑', TRASH.x + TRASH.w / 2, TRASH.y + 28);
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText(TRASH.label, TRASH.x + TRASH.w / 2, TRASH.y + TRASH.h - 8);
  ctx.restore();

  // ---- Chef ----
  drawChef(ctx, world, t);

  // ---- Particles ----
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (1 - p.t / p.life * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ---- Hand tray ----
  ctx.save();
  rr(ctx, 300, 742, 680, 48, 10);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fill();
  ctx.fillStyle = COLORS.cream;
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('HANDS', 318, 766);
  world.hands.forEach((ing, i) => {
    chip(ctx, 390 + i * 56, 752, 48, 28, ing);
  });
  if (world.hands.length === 0) {
    ctx.fillStyle = COLORS.muted;
    ctx.font = 'italic 13px system-ui, sans-serif';
    ctx.fillText('empty — grab ingredients from the bins', 390, 766);
  }
  ctx.fillStyle = COLORS.muted;
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('WASD / click to move · E interact · SPACE serve · P pause · M mute', 1264, 768);
  ctx.restore();

  // ---- Floaters ----
  for (const f of world.floaters) {
    ctx.globalAlpha = Math.max(0, 1 - f.t / f.life);
    ctx.fillStyle = f.color;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x, f.y - f.t * 40);
  }
  ctx.globalAlpha = 1;

  // ---- Overlays ----
  if (world.screen === SCREEN_TITLE) {
    ctx.fillStyle = 'rgba(12,8,5,0.82)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f7b731';
    ctx.font = 'bold 72px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🍳 SIZZLE RUSH', W / 2, 190);
    ctx.fillStyle = COLORS.cream;
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.fillText('RUSH HOUR KITCHEN', W / 2, 236);
    ctx.fillStyle = COLORS.muted;
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('Tickets are flying in. Cook fast, serve faster — three walk-outs and the shift is over.', W / 2, 292);
    const steps = [
      '1 · Grab ingredients from the bins (click a bin or walk up and press E)',
      '2 · Grill the patty · chop lettuce & tomato · boil the pasta — watch the timers, burnt food goes in the trash',
      '3 · Stack the dish on the assembly plate, exactly like the ticket',
      '4 · Hit SERVE (or SPACE) while the ticket still has patience — tips shrink as patience drains',
    ];
    ctx.textAlign = 'left';
    steps.forEach((s, i) => {
      ctx.fillStyle = COLORS.cream;
      ctx.font = '19px system-ui, sans-serif';
      ctx.fillText(s, 300, 360 + i * 40);
    });
    ctx.fillStyle = '#f7b731';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const pulse = 0.7 + Math.sin(t * 4) * 0.3;
    ctx.globalAlpha = pulse;
    ctx.fillText('Press ENTER or click to start the shift', W / 2, 570);
    ctx.globalAlpha = 1;
    ctx.fillStyle = COLORS.muted;
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('Best score: ' + (world.best ?? 0), W / 2, 612);
  }

  if (world.screen === SCREEN_OVER) {
    ctx.fillStyle = 'rgba(12,8,5,0.85)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = world.strikes >= MAX_STRIKES ? '#e84a4a' : '#f7b731';
    ctx.font = 'bold 56px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(world.strikes >= MAX_STRIKES ? 'SHIFT RUINED!' : "SHIFT'S OVER!", W / 2, 220);
    ctx.fillStyle = COLORS.cream;
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(`Final score: ${world.score}`, W / 2, 300);
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(`Dishes served: ${world.served}   ·   Best combo: x${world.bestCombo}   ·   Tips earned: $${world.tips}`, W / 2, 348);
    ctx.fillStyle = '#f7b731';
    ctx.font = 'bold 24px system-ui, sans-serif';
    const pulse = 0.7 + Math.sin(t * 4) * 0.3;
    ctx.globalAlpha = pulse;
    ctx.fillText('Press R to cook again', W / 2, 430);
    ctx.globalAlpha = 1;
  }

  if (world.paused) {
    ctx.fillStyle = 'rgba(12,8,5,0.7)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = COLORS.cream;
    ctx.font = 'bold 48px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', W / 2, H / 2);
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('Press P to keep cooking', W / 2, H / 2 + 44);
  }
  ctx.restore();
}
