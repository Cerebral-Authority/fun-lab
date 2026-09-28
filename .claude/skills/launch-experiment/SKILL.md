---
name: launch-experiment
description: Launch or release a Fun Lab experiment end to end. Use when adding a new experiment (a new UX or UI effect) to this repo, turning a prototype or artifact into a package, recording or re-recording a preview video, adding an experiment to the gallery page or README, publishing a new version to npm, or verifying a release. Covers the library contract, demo page, preview clip, gallery card with GitHub and npm icons, npm publish, integrity snippet, and tagging.
---

# Launch a Fun Lab experiment

Fun Lab is a monorepo: each experiment is `packages/<name>/`, published to npm as `@cerebralauthority/<name>` and demoed at `https://fun-lab.cerebralauthority.com/<name>/`. Read the root `README.md` maintainer guide for the folder map. `packages/scroll-catapult/` is the reference implementation; copy its patterns.

Work through the phases in order. Each ends with a check; do not move on until it passes.

## Phase 1: Library contract

A prototype is not a library. Before anything is public, the code must meet every item below, because it will run on strangers' websites.

- **No side effects at rest.** Never set global styles (`user-select`, `overflow`, etc.) or block browser defaults (context menu, scrolling, selection) except during the interaction itself, and undo them after.
- **Owns its own DOM.** Create elements in code, inside a custom element with a Shadow DOM (`<fun-thing>`), so site CSS and library CSS cannot collide. No dependence on page markup or ids.
- **Input scoped sensibly.** Touch first effects default to `pointerTypes: ['touch', 'pen']`; mouse is opt-in. Skip links, buttons, form fields, media, and `[data-catapult-ignore]`-style opt-out attributes.
- **Accessibility.** Off when `prefers-reduced-motion: reduce` (and live on change). Decorative overlays get `aria-hidden="true"`. Native keyboard and screen reader behavior unchanged.
- **Lifecycle.** `init(options)` returns `{ destroy, enable, disable, isEnabled }`; `destroy()` removes every listener, element, style, and timer. A second `init()` replaces the first.
- **Options** for timings, colors (hex), effects on or off, z-index. CSS custom properties for colors a light site will need to change.
- **Portable.** UMD wrapper (script tag and CommonJS), `.d.ts` using the `declare namespace X` + `export =` + `export as namespace X` pattern, safe to import during server side rendering (touch `window` only inside `init`), no dependencies, no network requests, no cookies.
- **Respect site settings** it could fight, such as `scroll-behavior: smooth` (the catapult pauses it during flight and restores it).

Check: `packages/<name>/test/behavior.html` covers the contract (see `references/testing.md`) and `npm test -- <name>` passes. Every bug fixed gets a regression check that is shown to fail on the old code.

## Phase 2: Package and demo

1. Copy `packages/scroll-catapult` to `packages/<name>` (lowercase, hyphens; this becomes the URL path).
2. `package.json`: `name` (`@cerebralauthority/<name>`), `description`, `version` `0.1.0`, `homepage`, `repository.directory`, `files` (library, types, `CHANGELOG.md`), `main`, `types`, `unpkg`, `jsdelivr`. Keep `publishConfig.access: public`.
3. `README.md`: GIF at the top (absolute `raw.githubusercontent.com` URL so it renders on npm too), how the interaction works, install for any website and for npm, React example, options table, API, "What it does to your page", limits, license.
4. `CHANGELOG.md` entry for `0.1.0`.
5. `demo/index.html`: breadcrumb `Fun Lab / <Name>`, how-to panel, an install panel marked with the library's ignore attribute, links row (GitHub and npm links carry their icons, see `references/gallery-card.md`), then enough page to demonstrate. It loads `./<name>.js`. If the demo enables mouse for desktop visitors, say so on the page.

Check: `npm run preview`, open `http://localhost:8080/<name>/` on desktop and on a phone on the same Wi-Fi.

## Phase 3: Preview clip

1. Write `packages/<name>/preview.scenario.mjs` (copy scroll-catapult's). It drives the demo with real touch events via `api.touch`, and calls `api.markStart()` / `api.markEnd(t)` so the clip opens at the most telling moment and ends as the payoff finishes, which makes the loop tight. Detect the payoff from the page (for example a MutationObserver on the shadow root) rather than guessing times.
2. `npm run record -- <name>` writes `demo/preview.mp4` (website), `preview.jpg` (poster), `preview.gif` (READMEs) at 2:3.
3. Inspect it: extract a contact sheet with ffmpeg (`select='not(mod(n\,8))',tile=10x1`) and look at the frames. Confirm the gesture reads, the payoff is visible, and the loop point is clean. If the payoff never fires, suspect the library before the recorder.

Check: clip roughly 2 to 4 seconds, MP4 under about 500 KB, GIF under about 1 MB.

## Phase 4: Gallery and README

1. Add a card to `site/index.html` using the template in `references/gallery-card.md`: tag, name, preview `<video>` between the name and the description, and the GitHub and npm icon links in the top right corner. The icons are siblings of the card link, never inside it (links cannot nest).
2. Add a section to the root `README.md` Experiments list with the GIF (relative path) linking to the live demo, one line of description, and Try it · Docs · install.
3. Screenshot the gallery at phone width with device emulation (plain `--window-size` below 500 px is clipped by Chrome's minimum window width and gives false overflow) and confirm no horizontal scroll and the video plays.

Check: push to `main`, `gh run watch` the "Deploy site" run to success, then load the live URLs.

## Phase 5: Release to npm

Publishing is public and permanent (a version number can never be reused; unpublish only within 72 hours). Get Ray's explicit go ahead first.

0. `npm test -- <name>` passes, and the version and `CHANGELOG.md` entry are updated.
1. Confirm the account: `npm whoami` (expect `cerebral-authority`) and `npm org ls cerebralauthority`.
2. `npm pack --dry-run` in the package folder: only the library, types, README, CHANGELOG, LICENSE, package.json. No demo, no scenario.
3. Ray runs `npm publish` in the Mac Terminal app from `~/Desktop/fun-lab/packages/<name>`. Tell him plainly: no `!` prefix in Terminal (there `!` negates the command and `&&` then skips the publish), press Enter at `Authenticate your account at:`, approve in the browser with the authenticator code, wait for the `+ @cerebralauthority/<name>@<version>` line.
4. If `npm view` still returns 404 right after the `+` line, check `npm access get status @cerebralauthority/<name>`; the public lookup lags a minute or so, especially if the name was queried before it existed.
5. `npm run release-check -- <name>`: confirms the published file matches the repo byte for byte and prints the pinned snippet (exact version plus sha384 `integrity`). Put that snippet in the package README and `demo/index.html`, rerun until all `ok`, push.
6. Tag with the command release-check prints (`<name>@<version>`) and push the tag.
7. Ask Ray to open the printed CDN link and confirm the library header appears.

Check: all three routes work: npm install, the CDN snippet, and the file in the public repo. Record how each was verified in `CHANGELOG.md`, including anything not yet observed.

## Boundaries

- Never add an experiment to cerebralauthority.com or a client site without Ray's explicit request. If asked, work from a clean worktree of the deploying branch (not the local checkout, which may hold unpushed work), install from npm, and ship through a preview deployment first.
- Never commit secrets. Never merge outside pull requests without reviewing them, especially changes to `.github/workflows/`.
- Writing style for every file in this repo: no em dashes or en dashes.
