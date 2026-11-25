// SIZZLE RUSH — Rush Hour Kitchen. Configuration: field, stations, recipes, colours.
// All coordinates are in the game's logical 1280x800 canvas space.

export const W = 1280;
export const H = 800;

// Floor the chef walks on.
export const FLOOR = { x: 16, y: 218, w: 1248, h: 512 };

// Chef.
export const CHEF = { speed: 300, radius: 26, interactRange: 120 };

// Shift length and strikes.
export const SHIFT_SECONDS = 180;
export const MAX_STRIKES = 3;
export const MAX_HAND = 3;

// Ingredient ids.
export const ING = {
  BUN: 'bun',
  PATTY_RAW: 'patty_raw',
  PATTY: 'patty',
  LETTUCE: 'lettuce',
  LETTUCE_CHOP: 'lettuce_chop',
  TOMATO: 'tomato',
  TOMATO_CHOP: 'tomato_chop',
  CHEESE: 'cheese',
  PASTA: 'pasta',
  PASTA_BOILED: 'pasta_boiled',
};

// Display names, colours and a one-letter glyph drawn on the ingredient chip.
export const ING_META = {
  [ING.BUN]: { name: 'Bun', short: 'Bun', color: '#e8b25c', dark: '#a8762e', glyph: '◠' },
  [ING.PATTY_RAW]: { name: 'Raw Patty', short: 'Patty', color: '#c96f6f', dark: '#8e3b3b', glyph: '●' },
  [ING.PATTY]: { name: 'Grilled Patty', short: 'Patty', color: '#7a4a21', dark: '#4d2c10', glyph: '●' },
  [ING.LETTUCE]: { name: 'Lettuce', short: 'Lett.', color: '#7fc95c', dark: '#3f7d2a', glyph: '✿' },
  [ING.LETTUCE_CHOP]: { name: 'Chopped Lettuce', short: 'Lett.', color: '#8fd96a', dark: '#3f7d2a', glyph: '✿' },
  [ING.TOMATO]: { name: 'Tomato', short: 'Tom.', color: '#e84a4a', dark: '#9e1f1f', glyph: '●' },
  [ING.TOMATO_CHOP]: { name: 'Chopped Tomato', short: 'Tom.', color: '#f26a5e', dark: '#9e1f1f', glyph: '◐' },
  [ING.CHEESE]: { name: 'Cheese', short: 'Cheese', color: '#f7cf4a', dark: '#b8891a', glyph: '▣' },
  [ING.PASTA]: { name: 'Dry Pasta', short: 'Pasta', color: '#f2d98c', dark: '#b89b45', glyph: '≡' },
  [ING.PASTA_BOILED]: { name: 'Boiled Pasta', short: 'Pasta', color: '#f7e3a1', dark: '#b89b45', glyph: '≋' },
};

// Processing rules: what a station does to an ingredient.
export const PROCESS = {
  grill: { accepts: [ING.PATTY_RAW], result: ING.PATTY, seconds: 5, burnAfter: 5, label: 'GRILL' },
  board: { accepts: [ING.LETTUCE, ING.TOMATO], result: null, seconds: 3, burnAfter: Infinity, label: 'CHOP' },
  pot: { accepts: [ING.PASTA], result: ING.PASTA_BOILED, seconds: 6, burnAfter: 8, label: 'BOIL' },
};
// Board result depends on the input.
export function boardResult(input) {
  return input === ING.LETTUCE ? ING.LETTUCE_CHOP : ING.TOMATO_CHOP;
}

// Recipes: the dishes on the menu.
export const RECIPES = [
  { id: 'burger', name: 'Classic Burger', needs: [ING.BUN, ING.PATTY, ING.LETTUCE_CHOP, ING.TOMATO_CHOP], base: 120, color: '#e8a13c' },
  { id: 'cheeseburger', name: 'Cheese Melt', needs: [ING.BUN, ING.PATTY, ING.CHEESE], base: 100, color: '#f7cf4a' },
  { id: 'salad', name: 'Garden Salad', needs: [ING.LETTUCE_CHOP, ING.TOMATO_CHOP, ING.CHEESE], base: 80, color: '#7fc95c' },
  { id: 'pasta', name: 'Alfredo Pasta', needs: [ING.PASTA_BOILED, ING.CHEESE], base: 90, color: '#f2d98c' },
  { id: 'veggie', name: 'Veggie Stack', needs: [ING.BUN, ING.LETTUCE_CHOP, ING.TOMATO_CHOP, ING.CHEESE], base: 110, color: '#9ed67a' },
];

export function recipeById(id) {
  return RECIPES.find((r) => r.id === id);
}

// Ingredient bins along the top wall: pick up a raw ingredient here.
export const BINS = [
  { ing: ING.BUN, x: 48, y: 236, w: 96, h: 78, label: 'BUNS' },
  { ing: ING.PATTY_RAW, x: 156, y: 236, w: 96, h: 78, label: 'PATTY' },
  { ing: ING.LETTUCE, x: 264, y: 236, w: 96, h: 78, label: 'LETTUCE' },
  { ing: ING.TOMATO, x: 372, y: 236, w: 96, h: 78, label: 'TOMATO' },
  { ing: ING.CHEESE, x: 480, y: 236, w: 96, h: 78, label: 'CHEESE' },
  { ing: ING.PASTA, x: 588, y: 236, w: 96, h: 78, label: 'PASTA' },
];

// Processing stations: grill (2 slots), chopping board (2 slots), pot (1 slot).
export const STATIONS = [
  { kind: 'grill', slots: 2, x: 724, y: 232, w: 200, h: 86, label: 'GRILL', color: '#3a3f4a' },
  { kind: 'board', slots: 2, x: 948, y: 232, w: 200, h: 86, label: 'CHOPPING BOARD', color: '#8a6b46' },
  { kind: 'pot', slots: 1, x: 724, y: 340, w: 120, h: 86, label: 'POT', color: '#4a5568' },
];

// Assembly counter (the plate) and the serving window.
export const COUNTER = { x: 880, y: 340, w: 180, h: 86, label: 'ASSEMBLY' };
export const SERVE = { x: 1088, y: 340, w: 176, h: 86, label: 'SERVE' };
export const TRASH = { x: 48, y: 700, w: 96, h: 62, label: 'TRASH' };

// Order board (top right).
export const BOARD = { x: 700, y: 76, w: 564, h: 132 };
export const ORDER_PATIENCE = 50; // seconds an order waits before it walks out
export const ORDER_FIRST_DELAY = 6; // seconds until the first ticket
export const ORDER_INTERVAL = 13; // seconds between tickets (shrinks as the shift goes on)

// Palette.
export const COLORS = {
  bg: '#1c1410',
  floor: '#2e2118',
  floorTileA: '#33261c',
  floorTileB: '#2b1f16',
  wall: '#4a2f22',
  wallTop: '#5d3d2c',
  cream: '#f5ead6',
  ink: '#241a12',
  muted: '#b9a68d',
  gold: '#f7b731',
  red: '#e84a4a',
  green: '#7fc95c',
  panel: '#fbf3e2',
  panelDark: '#efe3c8',
};
