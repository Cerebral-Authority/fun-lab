# Testing an experiment

## Behavior tests: `npm test -- <name>`

Each package keeps `test/behavior.html`, a plain page that loads `../<name>.js`, drives it with synthetic `PointerEvent`s, and writes `PASS name` or `FAIL name` lines between `RESULTS` and `DONE` in `<pre id="out">`. `scripts/test.mjs` loads it in headless Chrome with `--dump-dom --virtual-time-budget` and exits nonzero on any failure. Start from `packages/scroll-catapult/test/behavior.html`.

Cover at least:

- Nothing injected before `init`; host element and Shadow DOM after.
- The page at rest is untouched: no selection lock, context menu allowed.
- Default input types honored (mouse ignored by default for touch first effects); ignored elements never start the interaction.
- Side effects appear only during the interaction and are released after.
- The payoff happens (for the catapult: the page flies and a full charge detonates).
- `disable()`, `enable()`, reduced motion, re-`init` replacing the old instance, and `destroy()` removing everything.

## Headless Chrome quirks

- **Animation frames.** In `--dump-dom` mode headless Chrome runs only one `requestAnimationFrame`, so anything driven by rAF never progresses. The test page replaces rAF with a timer driven fake clock (`window.__rafStep` ms per frame). This also lets a test place a frame at an exact moment, which is how the catapult's impact regression test forces the edge case.
- **Prove a regression test catches its bug.** Run it once against the old code (`git show <old-commit>:packages/<name>/<name>.js`) and confirm it fails, then against the fix and confirm it passes. A test that passes on both proves nothing.
- **Phone layout checks** need device emulation over the DevTools protocol (`Emulation.setDeviceMetricsOverride` with `mobile: true`), as `scripts/record-preview.mjs` does. `--window-size` below about 500 px is clipped by Chrome's minimum window width and shows false horizontal overflow.
- **Real touch.** `Input.dispatchTouchEvent` over the DevTools protocol produces real pointer and touch events (with `touchmove` cancelable), closer to a phone than synthetic events. The preview recorder uses it; reuse that setup when a behavior depends on native scrolling.

## Before a release

1. `npm test -- <name>`: all pass.
2. `npm run record -- <name>` if the visuals changed, and inspect a contact sheet.
3. `npm run preview` and try it on a real phone on the same Wi-Fi.
