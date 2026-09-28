# Changelog

## 0.1.0 (2026-09-28)

First public release.

- Hold, pull to aim, release to launch the page; a full charge detonates against the end of the page.
- Drop-in library: Shadow DOM overlay, text selection and long press menus paused only during a gesture, touch and pen by default (mouse opt-in), off for reduced motion visitors, `init()` options, `destroy()`, `enable()`, `disable()`, safe to import during server side rendering.
- Impact speed is measured along the flight path, so a full charge detonates every time (the prototype missed some impacts depending on frame timing).

### Verified at release

| Install route | How it was verified |
| --- | --- |
| npm | Installed from the registry into a Next.js 16 production site: type check, lint, and `next build` passed. |
| CDN snippet | The jsDelivr URL serves the file; the published file matches this repo byte for byte (`npm run release-check -- scroll-catapult`); the snippet's sha384 integrity hash was computed from the published file. |
| GitHub | Public repo; the file in `packages/scroll-catapult/` is identical to the published one. Tagged `scroll-catapult@0.1.0`. |

Not yet observed: a browser loading the CDN snippet with the integrity attribute on a live third party page.
