// SIZZLE RUSH — entry point: game loop, screens, pause, best score, sounds.

import { H, W } from './config.js';
import { createInput } from './input.js';
import { draw } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, World } from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

function fitCanvas() {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = `${Math.floor(W * scale)}px`;
  canvas.style.height = `${Math.floor(H * scale)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') ?? 1) || 1;

const world = new World(seed);
try {
  world.best = Number(localStorage.getItem('sizzle-rush-best') ?? 0) || 0;
} catch {
  world.best = 0;
}

const input = createInput(canvas);
const audio = createAudio();
let paused = false;
let last = performance.now();
let t = 0;

function saveBest() {
  if (world.score > world.best) {
    world.best = world.score;
    try {
      localStorage.setItem('sizzle-rush-best', String(world.best));
    } catch {
      // storage unavailable; best lives for this session only
    }
  }
}

function describe() {
  if (!statusEl) return;
  if (world.screen === SCREEN_TITLE) {
    statusEl.textContent = 'Sizzle Rush: a rush hour kitchen game. Press Enter to start.';
  } else if (world.screen === SCREEN_OVER) {
    statusEl.textContent = `Shift over. Final score ${world.score}. Dishes served ${world.served}. Press R to play again.`;
  } else {
    const order = world.orders[0];
    statusEl.textContent = `Score ${world.score}. ${Math.ceil(world.timeLeft)} seconds left. ` +
      (order ? `Oldest ticket: ${order.recipeId}, ${Math.ceil(order.patience)} seconds of patience.` : 'No tickets.') +
      ` Holding ${world.hands.length} items. Plate has ${world.plate.length} items.`;
  }
}

canvas.addEventListener('pointerdown', () => {
  if (world.screen === SCREEN_TITLE) world.start();
});

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'enter' && world.screen === SCREEN_TITLE) world.start();
  if (k === 'r' && world.screen === SCREEN_OVER) {
    world.start();
  }
  if ((k === 'p' || k === 'escape') && world.screen === SCREEN_PLAY) {
    paused = !paused;
    world.paused = paused;
  }
  if (k === 'm') {
    const muted = audio.toggleMute();
    if (statusEl) statusEl.textContent = muted ? 'Sound muted.' : 'Sound on.';
  }
});

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  t += dt;
  if (world.screen === SCREEN_PLAY && !paused) {
    const inp = input.poll();
    world.step(dt, inp);
    for (const s of world.sounds) audio.play(s);
    if (world.screen === SCREEN_OVER) saveBest();
    describe();
  } else {
    input.poll();
  }
  draw(ctx, world, t);
  if (!shotName) requestAnimationFrame(frame);
}

// Screenshot mode: stage the scene, draw one frame, signal readiness.
if (shotName) {
  stageShot(shotName, world);
  draw(ctx, world, 1.2);
  describe();
  window.__shotReady = true;
} else {
  requestAnimationFrame(frame);
}
