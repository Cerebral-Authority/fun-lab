# Scroll Catapult

<a href="https://fun-lab.cerebralauthority.com/scroll-catapult/"><img src="https://raw.githubusercontent.com/Cerebral-Authority/fun-lab/main/packages/scroll-catapult/demo/preview.gif" width="320" alt="Scroll Catapult on a phone: the scrollbar charges under a pulled finger, the page launches to the bottom and detonates"></a>

Hold, aim, and launch the page. Scroll Catapult replaces "swipe, swipe, swipe" on long mobile pages with a slingshot: hold a blank spot, pull to aim, release to fly. A full charge slams into the end of the page and detonates.

**Live demo:** https://fun-lab.cerebralauthority.com/scroll-catapult/

- No dependencies, about 25 KB unminified
- Touch and pen only by default, so desktop mouse users are not affected
- Turns itself off for visitors who prefer reduced motion
- Its own overlay lives in a Shadow DOM, so your site's CSS and its CSS never collide
- `destroy()` removes every listener, element and style it added

## How the gesture works

1. **Hold** a blank spot (not a link or button) for a third of a second. The scrollbar appears.
2. **Keep holding** to build power, or **pull** to aim like a slingshot: pull down to fly up, pull up to fly down. The pink side of the bar shows where you will go.
3. **Release** to launch. Tap during flight to stop.

## Install

### Any website (Webflow, WordPress, Framer, Squarespace, plain HTML)

Paste this before the closing `</body>` tag (in Webflow: Site settings, Custom code, Footer code):

```html
<script src="https://cdn.jsdelivr.net/npm/@cerebralauthority/scroll-catapult@0"></script>
<script>ScrollCatapult.init();</script>
```

The `@0` pins you to the 0.x releases, so a future breaking version will not change your site without you choosing it.

### npm (React, Next.js, Vue, Svelte, anything with a bundler)

```bash
npm install @cerebralauthority/scroll-catapult
```

```js
import ScrollCatapult from '@cerebralauthority/scroll-catapult';

const catapult = ScrollCatapult.init();
// later, for example when a component unmounts:
catapult.destroy();
```

React example:

```jsx
import { useEffect } from 'react';
import ScrollCatapult from '@cerebralauthority/scroll-catapult';

export function useScrollCatapult(options) {
  useEffect(() => {
    const catapult = ScrollCatapult.init(options);
    return () => catapult.destroy();
  }, []);
}
```

It is safe to import during server side rendering; `init()` does nothing until it runs in a browser.

## Options

All options are optional.

```js
ScrollCatapult.init({
  accentColor: '#8f6fff',        // anchor ring and resting glow
  destinationColor: '#ff5fbf',   // side of the bar you will fly toward
  originColor: '#ff9040',        // side of the bar you launch from
  explosions: true,              // fireball and sparks on a hard landing
  pointerTypes: ['touch', 'pen'],// add 'mouse' to allow desktop click and hold
  holdMs: 333,                   // press time to summon the scrollbar
  holdFullMs: 1000,              // holding still: time to full power
  flightMinMs: 900,              // flight time at low power
  flightMaxMs: 2100,             // flight time at full power
  respectReducedMotion: true,    // stay off for reduced motion visitors
  ignore: 'a, button, input, ...', // where a gesture must never start
  zIndex: 9000
});
```

| Option | Default | What it does |
| --- | --- | --- |
| `holdMs` | `333` | Press duration in ms to summon the scrollbar |
| `moveTolerance` | `12` | Pixels of drift allowed during the hold before it counts as a normal scroll |
| `edgePadding` | `28` | No tap zone in px around the screen edges, so system gestures still work |
| `holdFullMs` | `1000` | Holding still after the summon: ms to reach full power |
| `minPower` | `0.06` | Releases weaker than this (0 to 1) cancel |
| `maxTravel` | `1.15` | Full power travel as a multiple of the page height |
| `flightMinMs` | `900` | Flight time at the lowest power |
| `flightMaxMs` | `2100` | Flight time at full power |
| `impactSpeed` | `900` | Speed in px/s needed to detonate against the top or bottom |
| `hideDelay` | `450` | Ms after landing before the bar fades |
| `explosions` | `true` | Fireball, shockwave and sparks on a hard landing |
| `pointerTypes` | `['touch', 'pen']` | Which input types can start a gesture |
| `respectReducedMotion` | `true` | Stay off when the visitor has reduced motion turned on |
| `ignore` | links, buttons, form fields, media, `[data-catapult-ignore]` | CSS selector for elements where a gesture must never start |
| `accentColor` | `'#8f6fff'` | Hex color for the anchor ring |
| `destinationColor` | `'#ff5fbf'` | Hex color toward the landing side |
| `originColor` | `'#ff9040'` | Hex color on the launch side |
| `zIndex` | `9000` | Stacking order of the overlay |

### Keeping it out of part of your page

Add `data-catapult-ignore` to any element, and a hold that starts inside it will behave normally:

```html
<div class="carousel" data-catapult-ignore>...</div>
```

On text heavy pages (articles, docs), consider ignoring the article body so readers can still long press to select text:

```js
ScrollCatapult.init({
  ignore: ScrollCatapult.defaults.ignore + ', article'
});
```

### Styling the bar for light sites

The resting bar is frosted white glass, designed for dark backgrounds. On a light site, override these CSS variables:

```css
scroll-catapult {
  --sc-track-bg: rgba(20, 20, 30, 0.06);
  --sc-track-border: rgba(20, 20, 30, 0.18);
  --sc-thumb-bg: rgba(20, 20, 30, 0.35);
  --sc-thumb-border: rgba(20, 20, 30, 0.4);
}
```

## API

| Call | What it does |
| --- | --- |
| `ScrollCatapult.init(options)` | Attach to the page and return an instance. Calling it again replaces the previous instance. |
| `instance.destroy()` | Remove every listener, element and style it added |
| `instance.disable()` / `instance.enable()` | Pause and resume without removing anything |
| `instance.isEnabled()` | `false` when disabled, destroyed, or paused for reduced motion |
| `ScrollCatapult.destroy()` | Destroy the current instance, if any |
| `ScrollCatapult.defaults` | The default options, read only |
| `ScrollCatapult.version` | The library version |

## What it does to your page

So you know exactly what you are installing:

- Adds one `<scroll-catapult>` element to `<body>`. Everything visual is inside its Shadow DOM.
- Adds one small `<style id="scroll-catapult-lock">` to `<head>`. It only takes effect while a gesture is in progress, when it pauses text selection and the iOS long press menu.
- Listens for pointer, touch, scroll, resize, wheel and key events. It only cancels the browser's default behavior (scrolling, context menu, text selection) while a gesture is actually charging.
- During a flight, it temporarily sets `scroll-behavior: auto` on `<html>` so a site wide smooth scroll setting does not fight the animation, then puts your value back.
- No network requests, no cookies, no tracking.

## Limits

- It moves the main page scroll (`window`). It does not drive scrolling inside inner containers.
- It needs a page with real scroll distance. On a short page there is nowhere to fly.
- It is decorative. The overlay is `aria-hidden`, and keyboard and screen reader scrolling are unchanged.

## Browser support

Current Safari (iOS and macOS), Chrome, Edge and Firefox. It relies on Pointer Events, Shadow DOM and the Web Animations API.

## License

MIT. See [LICENSE](LICENSE).

Made by [Cerebral Authority](https://cerebralauthority.com). More experiments at [fun-lab.cerebralauthority.com](https://fun-lab.cerebralauthority.com).
