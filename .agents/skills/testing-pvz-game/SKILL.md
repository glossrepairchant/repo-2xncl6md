---
name: testing-pvz-game
description: Test the Plants vs Zombies browser game end-to-end. Use when verifying gameplay (sun economy, planting, peashooter combat, win/lose) for this repo.
---

# Testing the Plants vs Zombies game

Pure static site: `index.html` + `styles.css` + `js/*.js`. No build, no dependencies, no secrets.

## Run it
```bash
cd <repo> && python -m http.server 8123    # any static server works
```
Open `http://127.0.0.1:8123/index.html`.

### Devin Secrets Needed
None.

## Browser gotchas (Windows/Chrome-for-Testing)
- The `computer` tool's `type` action can **drop colons** in the Chrome omnibox, turning a URL into a Google search. Don't type URLs into the omnibox. Instead launch via PowerShell: `Start-Process chrome 'http://127.0.0.1:8123/index.html'`.
- The page is taller than the viewport (topbar + 500px board + the Chrome-for-Testing banner). **Zoom the page to 80%** (`Ctrl -` twice) so the seed bar AND the full lawn are visible at once — otherwise scrolling hides the seed cards you need to click.
- A Chrome translate popup appears on load/reload; dismiss it (click the `X`).

## Reliable test flow
The real economy is intentionally slow and 5 lanes are hard to defend in real time. For a clean, deterministic demo, **temporarily** edit `js/config.js` (REVERT before finishing — verify with `git diff`):
- `startingSun: 500` and `skySunInterval: 4000` -> enough sun to plant immediately.
- `WAVES = [[{ type: "normal", row: 0, delay: 2500 }]]` -> a single zombie in row 0 so one peashooter cleanly kills it -> triggers the victory overlay.

Reload (`F5`) after editing config so the new values load.

### Click-mapping math (at 80% zoom, default canvas 900x500)
Clicks are mapped via `getBoundingClientRect`, so coordinates work at any zoom. The lawn grid has `marginLeft/Top=40`, 9 cols x 5 rows. Plant by selecting a seed card (top bar) then clicking a lawn cell. Cell centers are roughly: col1~x367 display, row0~y351, row2~y492, row3~y562 (at 80% zoom, maximized 1024-wide window).

## Assertions that distinguish working vs broken
- Plant a sunflower: sun must drop by **exactly its cost** (50) and the emoji appears **in the clicked cell**.
- Collect a sun: counter increases by **exactly 25**. NOTE: clicking a *falling* sun often misses because the on-screen position lags (~70px/s descent) — the screenshot is ~5s stale. Click suns **after they settle**, or watch the counter across a couple screenshots (it may update later than expected; collection still worked).
- Peashooter fires green peas **only when a zombie is ahead in its row**; repeated hits drop the zombie HP bar and it disappears.
- All zombies cleared -> victory overlay with restart. Zombie reaching left edge -> defeat overlay with restart.

## Recording
Maximize window first (`wmctrl` on Linux; on Windows use the maximize button). Annotate with test_start/assertion per test. Keep it one continuous recording of: start -> plant -> combat -> victory -> (optional) defeat.
