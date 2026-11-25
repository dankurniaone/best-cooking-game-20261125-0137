// Screenshot scenes for SIZZLE RUSH. Each scene drives the real world forward
// (a simple autopilot plays by the same rules a human does) and returns the
// screen to draw, so every screenshot is a genuine render of the game itself.

import {
  BINS, COUNTER, ING, SERVE, recipeById,
} from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './world.js';

const STEP = 1 / 60;

function anchorOf(thing) {
  return { x: thing.x + thing.w / 2, y: thing.y + thing.h + 34 };
}

function binOf(ing) {
  return BINS.find((b) => b.ing === ing);
}

function stationOf(world, kind) {
  return world.stations.find((s) => s.kind === kind);
}

// The autopilot: a tiny state machine that cooks the oldest ticket.
class Pilot {
  constructor(world) {
    this.world = world;
    this.micro = []; // micro-steps for the current item
    this.phase = 'acquire';
    this.issued = false;
  }

  // Micro-steps to acquire one finished ingredient.
  microFor(ing) {
    if (ing === ING.BUN || ing === ING.CHEESE) {
      return [{ op: 'go', target: binOf(ing) }];
    }
    if (ing === ING.PATTY) {
      const grill = stationOf(this.world, 'grill');
      return [
        { op: 'go', target: binOf(ING.PATTY_RAW) },
        { op: 'go', target: grill },
        { op: 'wait', station: grill },
        { op: 'go', target: grill },
      ];
    }
    if (ing === ING.LETTUCE_CHOP) {
      const board = stationOf(this.world, 'board');
      return [
        { op: 'go', target: binOf(ING.LETTUCE) },
        { op: 'go', target: board },
        { op: 'wait', station: board },
        { op: 'go', target: board },
      ];
    }
    if (ing === ING.TOMATO_CHOP) {
      const board = stationOf(this.world, 'board');
      return [
        { op: 'go', target: binOf(ING.TOMATO) },
        { op: 'go', target: board },
        { op: 'wait', station: board },
        { op: 'go', target: board },
      ];
    }
    if (ing === ING.PASTA_BOILED) {
      const pot = stationOf(this.world, 'pot');
      return [
        { op: 'go', target: binOf(ING.PASTA) },
        { op: 'go', target: pot },
        { op: 'wait', station: pot },
        { op: 'go', target: pot },
      ];
    }
    return [];
  }

  nextInput() {
    const w = this.world;
    if (w.screen !== SCREEN_PLAY) return {};
    const order = w.orders[0];
    if (!order) return {};

    // Serve when the plate matches.
    if (w.matchingOrder()) {
      const a = anchorOf(SERVE);
      const d = Math.hypot(w.chef.x - a.x, w.chef.y - a.y);
      if (d < 70) return { interact: true };
      if (!this.issued) {
        this.issued = true;
        return { click: { x: a.x, y: a.y } };
      }
      if (w.chef.tx === null) this.issued = false;
      return {};
    }

    // Assemble what we hold that the ticket needs.
    const recipe = recipeById(order.recipeId);
    const heldNeeded = w.hands.filter((h) => recipe.needs.includes(h));
    if (heldNeeded.length > 0 && this.micro.length === 0) {
      const a = anchorOf(COUNTER);
      const d = Math.hypot(w.chef.x - a.x, w.chef.y - a.y);
      if (d < 70) return { interact: true };
      if (!this.issued) {
        this.issued = true;
        return { click: { x: a.x, y: a.y } };
      }
      if (w.chef.tx === null) this.issued = false;
      return {};
    }

    // Acquire the next missing ingredient.
    if (this.micro.length === 0) {
      const missing = recipe.needs.filter((n) => !w.plate.includes(n) && !w.hands.includes(n));
      if (missing.length === 0 || w.hands.length >= 3) return {};
      this.micro = this.microFor(missing[0]);
    }
    const step = this.micro[0];
    if (!step) return {};
    if (step.op === 'wait') {
      const done = step.station.slots.some((s) => s.ing && s.done && !s.burnt);
      if (done) this.micro.shift();
      return {};
    }
    // 'go': walk to the anchor; the click queues an interact on arrival.
    const a = anchorOf(step.target);
    if (!this.issued) {
      this.issued = true;
      return { click: { x: a.x, y: a.y } };
    }
    if (w.chef.tx === null && w.chef.ty === null) {
      // Arrived (and the queued interact fired).
      this.issued = false;
      this.micro.shift();
    }
    return {};
  }
}

function runSim(world, seconds, pilot) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i++) {
    const input = pilot ? pilot.nextInput() : {};
    const ev = world.step(STEP, input);
    if (ev) break;
  }
}

/**
 * Set `world` to the named scene and return the screen to draw.
 * start: title screen after a few seconds of kitchen ambience.
 * play: ~35s of autopilot cooking (a dish mid-assembly, tickets on the board).
 * serve: a finished plate matching a ticket, chef at the counter, SERVE glowing.
 * end: the shift runs out with an idle chef — strikes on the board, game over.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'start') {
    world.screen = SCREEN_TITLE;
    return { screen: SCREEN_TITLE, best: world.best };
  }
  if (name === 'serve') {
    world.start();
    // Force a burger ticket and stack it on the plate.
    world.orders = [{ id: 1, recipeId: 'burger', patience: 38, max: 50 }];
    world.plate = [ING.BUN, ING.PATTY, ING.LETTUCE_CHOP, ING.TOMATO_CHOP];
    world.chef.x = COUNTER.x + COUNTER.w / 2;
    world.chef.y = COUNTER.y + COUNTER.h + 60;
    world.step(STEP, {});
    return { screen: SCREEN_PLAY, best: world.best };
  }
  if (name === 'end') {
    world.start();
    runSim(world, 150, null); // idle chef: tickets walk out, shift ends
    return { screen: world.screen, best: world.best };
  }
  // play (default)
  world.start();
  const pilot = new Pilot(world);
  runSim(world, 38, pilot);
  return { screen: world.screen, best: world.best };
}
