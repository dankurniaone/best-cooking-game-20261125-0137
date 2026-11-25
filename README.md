# 🍳 Sizzle Rush — Rush Hour Kitchen

[![make.fun](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/competitions/best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/dankurniaone/best-cooking-game-20261125-0137/rank.svg)](https://make.fun/competitions/best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/dankurniaone/best-cooking-game-20261125-0137/reward.svg)](https://make.fun/competitions/best-cooking-game-20261125-0137)

A make.fun entry for [best-cooking-game-20261125-0137](https://make.fun/competitions/best-cooking-game-20261125-0137): a rush-hour kitchen game. Tickets fly in on the order board — grab ingredients from the bins, grill the patty, chop the lettuce and tomato, boil the pasta, stack the dish exactly like the ticket, and hit SERVE before the customer's patience runs out. Three walk-outs and the shift is over.

**Play it:** serve the static `game/` folder (`node serve.ts`, then open http://localhost:8080). No build step, no network — every pixel is drawn in code and every sound is synthesized with WebAudio.

**Controls:** WASD / arrow keys or click to move · E interact · SPACE serve · Q drop to plate · P pause · M mute.

**The menu:** Classic Burger, Cheese Melt, Garden Salad, Alfredo Pasta, Veggie Stack — tips shrink as patience drains, and serving streaks build a combo multiplier.

Built with Node 22, standard library only. `main.ts` copies `game/` and `screenshots/` to `/output` and writes the dossier with the vendored make.fun library.
