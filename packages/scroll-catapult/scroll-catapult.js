/*!
 * Scroll Catapult v0.1.0
 * Hold, aim, and launch the page. A touch first scrolling gesture.
 * (c) 2026 Cerebral Authority. MIT License.
 * https://fun-lab.cerebralauthority.com/scroll-catapult/
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ScrollCatapult = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERSION = '0.1.0';

  const DEFAULTS = Object.freeze({
    holdMs: 333,              // press duration to summon the scrollbar
    moveTolerance: 12,        // px of drift allowed during the hold
    edgePadding: 28,          // no tap zone around the viewport perimeter
    holdFullMs: 1000,         // holding still after summon: time to full pressure
    minPower: 0.06,           // release below this power cancels
    maxTravel: 1.15,          // full power carries past the far end, so it detonates
    flightMinMs: 900,         // flight time at low power
    flightMaxMs: 2100,        // flight time at full power
    impactSpeed: 900,         // px/s needed to detonate on the page ends
    hideDelay: 450,           // ms after settling before the bar fades
    explosions: true,         // fireball, shockwave and sparks on a hard landing
    pointerTypes: ['touch', 'pen'], // add 'mouse' to allow desktop click and hold
    respectReducedMotion: true,     // stay off when the visitor asks for less motion
    ignore: 'a, button, input, textarea, select, label, summary, video, audio, iframe, ' +
      '[contenteditable], [role="button"], [role="slider"], [data-catapult-ignore]',
    accentColor: '#8f6fff',      // anchor ring and resting glow
    destinationColor: '#ff5fbf', // side of the bar you will fly toward
    originColor: '#ff9040',      // side of the bar you launch from
    zIndex: 9000
  });

  // Internal tuning that shapes the feel; deliberately not exposed as options.
  // Full power draw scales with page height: a quarter of the screen on
  // ordinary pages, growing toward half on huge ones.
  const PULL_FRACTION_MIN = 1 / 4;
  const PULL_FRACTION_MAX = 1 / 2;
  const PAGE_VH_BASE = 20;
  const PULL_FRACTION_PER_VH = ((1 / 3) - (1 / 4)) / 40;
  const DIR_THRESHOLD = 4;     // px of pull before a direction is declared
  const PULSE_MIN_HZ = 0.5;    // breathing tempo at zero power
  const PULSE_MAX_HZ = 3.2;    // breathing tempo at full power

  const LOCK_ATTR = 'data-scroll-catapult-active';
  const LOCK_STYLE_ID = 'scroll-catapult-lock';

  let active = null;

  function toRgb(color, fallback) {
    const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(color || '').trim());
    if (!m) return toRgb(fallback);
    let h = m[1];
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    const n = parseInt(h, 16);
    return ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255);
  }

  function shadowCss(accent) {
    return (
      ':host { all: initial; }' +
      '.track {' +
      '  position: fixed; top: 14px; bottom: 14px; right: 8px; width: 10px;' +
      '  border-radius: 8px;' +
      '  background: var(--sc-track-bg, rgba(230, 225, 240, 0.08));' +
      '  border: 1px solid var(--sc-track-border, rgba(255, 255, 255, 0.14));' +
      '  backdrop-filter: blur(12px) saturate(1.35);' +
      '  -webkit-backdrop-filter: blur(12px) saturate(1.35);' +
      '  opacity: 0; pointer-events: none;' +
      '  transition: opacity 0.25s ease, width 0.15s ease, box-shadow 0.2s ease;' +
      '}' +
      '.track.visible { opacity: 1; }' +
      '.track.charging { width: 14px; box-shadow: 0 0 14px rgba(' + accent + ', 0.3); }' +
      '.thumb {' +
      '  position: absolute; left: 0; right: 0; border-radius: 999px; box-sizing: border-box;' +
      '  background: var(--sc-thumb-bg, linear-gradient(180deg, rgba(255, 255, 255, 0.34),' +
      '    rgba(255, 255, 255, 0.16) 45%, rgba(255, 255, 255, 0.22)));' +
      '  border: 1px solid var(--sc-thumb-border, rgba(255, 255, 255, 0.4));' +
      '  backdrop-filter: blur(8px) saturate(1.5);' +
      '  -webkit-backdrop-filter: blur(8px) saturate(1.5);' +
      '  box-shadow: 0 0 8px rgba(' + accent + ', 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.45);' +
      '}' +
      '.anchor {' +
      '  position: fixed; width: 26px; height: 26px; border-radius: 50%;' +
      '  border: 2px solid rgb(' + accent + ');' +
      '  transform: translate(-50%, -50%) scale(0.4);' +
      '  opacity: 0; pointer-events: none; box-sizing: content-box;' +
      '}' +
      '.anchor.pending { animation: sc-hold-ring 0.25s ease-out 0.08s forwards; }' +
      '@keyframes sc-hold-ring {' +
      '  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }' +
      '  100% { opacity: 0.85; transform: translate(-50%, -50%) scale(1); }' +
      '}' +
      '.anchor.armed {' +
      '  animation: none; opacity: 1; transform: translate(-50%, -50%) scale(1);' +
      '  background: rgba(' + accent + ', 0.25);' +
      '}'
    );
  }

  // Text selection and the iOS callout are suppressed only while a gesture
  // is in progress, never for the page at rest
  const LOCK_CSS =
    'html[' + LOCK_ATTR + '], html[' + LOCK_ATTR + '] * {' +
    '  -webkit-user-select: none !important; user-select: none !important;' +
    '  -webkit-touch-callout: none !important;' +
    '}';

  function noop() {}

  function inertInstance() {
    return { destroy: noop, enable: noop, disable: noop, isEnabled: function () { return false; } };
  }

  function create(userOptions) {
    const o = Object.assign({}, DEFAULTS, userOptions || {});
    const ACCENT = toRgb(o.accentColor, DEFAULTS.accentColor);
    const PINK = toRgb(o.destinationColor, DEFAULTS.destinationColor);
    const ORANGE = toRgb(o.originColor, DEFAULTS.originColor);
    const docEl = document.documentElement;

    // ---------- DOM: one custom element host, everything inside a shadow root ----------
    const host = document.createElement('scroll-catapult');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText =
      'position:fixed;inset:0;margin:0;padding:0;border:0;background:none;' +
      'display:block;pointer-events:none;z-index:' + (Number(o.zIndex) || DEFAULTS.zIndex) + ';';
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = shadowCss(ACCENT);
    const track = document.createElement('div');
    track.className = 'track';
    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    const anchor = document.createElement('div');
    anchor.className = 'anchor';
    track.appendChild(thumb);
    shadow.append(style, track, anchor);

    function mount() {
      if (!destroyed) document.body.appendChild(host);
    }

    let lockStyle = document.getElementById(LOCK_STYLE_ID);
    const ownsLockStyle = !lockStyle;
    if (!lockStyle) {
      lockStyle = document.createElement('style');
      lockStyle.id = LOCK_STYLE_ID;
      lockStyle.textContent = LOCK_CSS;
      (document.head || docEl).appendChild(lockStyle);
    }

    // ---------- State ----------
    let destroyed = false;
    let userEnabled = true;

    // idle -> pending (hold timer running) -> charging -> (release) -> flight
    let state = 'idle';
    let pointerId = null;
    let startX = 0, startY = 0;
    let curX = 0, curY = 0;
    let holdTimer = null;
    let hideTimer = null;
    let restoreTimer = null;

    let flinging = false;
    let flightRAF = null;
    let flingStartT = 0;
    let flingFrom = 0;
    let flingTarget = 0;
    let flingDur = 0;
    let flingPrevY = 0;
    let flingPrevT = 0;
    let flingWhite = 0; // knob whiteness carried out of the release
    let savedScrollBehavior = null;

    let currentPower = 0;
    let holdArmedT = 0; // when the summon completed; drives hold to build pressure
    let flyUp = null;   // null until the pull declares a direction

    // Which end of the page the last flight slammed into ('top' | 'bottom').
    // A plain hold fires opposite the last collision, so after crashing the
    // bottom, holding still sends you back up.
    let lastCollision = null;

    const reducedMotion = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;

    function isEnabled() {
      if (destroyed || !userEnabled) return false;
      return !(o.respectReducedMotion && reducedMotion && reducedMotion.matches);
    }

    // ---------- Listener bookkeeping, so destroy() removes everything ----------
    const listeners = [];
    function on(target, type, fn, opts) {
      target.addEventListener(type, fn, opts);
      listeners.push([target, type, fn, opts]);
    }

    // ---------- Scrollbar rendering ----------
    function docHeight() {
      return docEl.scrollHeight;
    }

    function pullFraction() {
      const screens = Math.max(0, docHeight() - window.innerHeight) / window.innerHeight;
      const f = PULL_FRACTION_MIN + Math.max(0, screens - PAGE_VH_BASE) * PULL_FRACTION_PER_VH;
      return Math.min(PULL_FRACTION_MAX, Math.max(PULL_FRACTION_MIN, f));
    }

    function updateThumb() {
      const vh = window.innerHeight;
      const dh = docHeight();
      const trackH = track.clientHeight;
      const thumbH = Math.max(44, trackH * (vh / dh));
      const maxScroll = Math.max(1, dh - vh);
      const progress = Math.min(window.scrollY / maxScroll, 1);
      thumb.style.height = thumbH + 'px';
      thumb.style.top = (progress * (trackH - thumbH)) + 'px';
    }

    function showBar() {
      clearTimeout(hideTimer);
      updateThumb();
      track.classList.add('visible');
    }

    function scheduleHideBar() {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function () {
        track.classList.remove('visible');
      }, o.hideDelay);
    }

    // ---------- Page lock, active only during a gesture ----------
    function lockPage() {
      docEl.setAttribute(LOCK_ATTR, '');
    }

    function unlockPage() {
      docEl.removeAttribute(LOCK_ATTR);
    }

    // ---------- Charge visuals ----------
    // Direction is drawn as a gradient: destination color toward where the
    // page will fly, origin color on the side it launches from, meeting at a
    // bright seam that tightens as the charge builds.
    function updateChargeVisuals(now, squeezePulse) {
      squeezePulse = squeezePulse || 0;
      const dy = curY - startY;

      if (Math.abs(dy) < DIR_THRESHOLD) {
        // Holding still: pressure builds on its own. Default is a shot down
        // the page; after a collision, polarity flips away from the struck end
        flyUp = lastCollision === 'bottom';
        currentPower = holdArmedT ? Math.min((now - holdArmedT) / o.holdFullMs, 1) : 0;
      } else {
        // Pulling: power is measured against the room this tap actually has,
        // so a tap near an edge still reaches full strength
        const pullingDown = dy > 0;
        const room = pullingDown ? (window.innerHeight - startY) : startY;
        const maxPull = Math.min(Math.max(room, 40), window.innerHeight * pullFraction());
        currentPower = Math.min(Math.abs(dy) / maxPull, 1);
        // Slingshot: pull down, page flies up
        flyUp = pullingDown;
      }

      const p = currentPower;
      const destA = Math.min(1, (0.22 + 0.62 * p) + (0.45 * p) * squeezePulse);
      const origA = Math.min(1, (0.16 + 0.42 * p) + (0.45 * p) * squeezePulse);
      const share = 14 + 72 * p;              // % of the bar that is destination color
      const blend = 34 - 31 * p;              // melt half width: loose to tight
      const seamA = 0.08 + 0.85 * p * p;      // merge line emerges as it tightens
      const dest = 'rgba(' + PINK + ', ' + destA + ')';
      const orig = 'rgba(' + ORANGE + ', ' + origA + ')';
      const seam = 'rgba(255, 255, 255, ' + seamA + ')';

      const pinkStop = Math.max(0, share - blend);
      const orangeStop = Math.min(100, share + blend);

      // 180deg paints from the top; flipping the angle flips which end is the destination
      const angle = flyUp ? '180deg' : '0deg';
      track.style.background =
        'linear-gradient(' + angle + ', ' +
        dest + ' 0%, ' + dest + ' ' + pinkStop + '%, ' +
        seam + ' ' + share + '%, ' +
        orig + ' ' + orangeStop + '%, ' + orig + ' 100%)';

      track.style.filter = 'brightness(' + (1 + 0.3 * p) + ')';
      track.style.borderColor = 'rgba(255, 255, 255, ' + (0.14 + 0.22 * p) + ')';
      thumb.style.filter = 'brightness(' + (1 + 0.35 * p) + ')';

      anchor.style.boxShadow =
        '0 0 0 ' + (6 + p * 10) + 'px rgba(' + PINK + ', ' + (0.10 + p * 0.18) + '), ' +
        '0 0 ' + (18 + p * 30) + 'px rgba(' + PINK + ', ' + (0.35 + p * 0.45) + ')';
    }

    // Kinetic energy meter: a smooth breath whose tempo climbs with the charge
    let breathePhase = 0;
    let breathePrevT = 0;
    let breatheRAF = null;

    function breatheFrame(t) {
      if (state !== 'charging') { breatheRAF = null; return; }
      if (!breathePrevT) breathePrevT = t;
      const dt = (t - breathePrevT) / 1000;
      breathePrevT = t;

      const hz = PULSE_MIN_HZ + currentPower * (PULSE_MAX_HZ - PULSE_MIN_HZ);
      breathePhase += dt * 2 * Math.PI * hz;
      const s = 0.5 + 0.5 * Math.sin(breathePhase);

      updateChargeVisuals(t, s);

      const depth = 0.35 + 0.65 * currentPower;

      // Squish under tension: the edge facing the flight direction stays
      // planted and the other end presses toward it
      const squishY = 1 - 0.35 * currentPower;
      const widenX = 1 + 0.14 * currentPower + 0.08 * s * depth;
      thumb.style.transformOrigin = (flyUp === true) ? 'center bottom' : 'center top';
      thumb.style.transform = 'scaleX(' + widenX + ') scaleY(' + squishY + ')';
      thumb.style.boxShadow =
        '0 0 ' + (8 + s * (8 + 24 * currentPower)) + 'px ' +
        'rgba(' + PINK + ', ' + (0.25 + 0.45 * s * depth) + '), ' +
        'inset 0 1px 0 rgba(255, 255, 255, 0.45)';
      track.style.boxShadow =
        '0 0 ' + (6 + s * (6 + 18 * currentPower)) + 'px ' +
        'rgba(' + PINK + ', ' + (0.08 + 0.3 * s * depth) + ')';

      breatheRAF = requestAnimationFrame(breatheFrame);
    }

    function startBreathing() {
      breathePhase = 0;
      breathePrevT = 0;
      if (!breatheRAF) breatheRAF = requestAnimationFrame(breatheFrame);
    }

    function clearChargeVisuals() {
      if (breatheRAF) cancelAnimationFrame(breatheRAF);
      breatheRAF = null;
      breathePrevT = 0;
      currentPower = 0;
      holdArmedT = 0;
      flyUp = null;
      anchor.classList.remove('pending', 'armed');
      anchor.style.opacity = '0';
      anchor.style.boxShadow = '';
      track.classList.remove('charging');
      track.style.background = '';
      track.style.boxShadow = '';
      track.style.filter = '';
      track.style.borderColor = '';
      thumb.style.boxShadow = '';
      thumb.style.transform = '';
      thumb.style.transformOrigin = '';
      thumb.style.filter = '';
    }

    // ---------- Impact blast (page top or bottom hit at speed) ----------
    function effect(css) {
      const el = document.createElement('div');
      el.style.cssText = 'position:fixed;pointer-events:none;' + css;
      shadow.appendChild(el);
      return el;
    }

    function spawnImpact(atTop, speed) {
      const m = Math.min(Math.max((speed || 0) / 6000, 0.5), 1);
      const x = window.innerWidth - 14;
      const y = atTop ? 16 : window.innerHeight - 16;
      const at = 'left:' + x + 'px;top:' + y + 'px;transform:translate(-50%,-50%);';

      // Fireball core
      const boom = effect(at + 'width:22px;height:22px;border-radius:50%;z-index:3;' +
        'background:radial-gradient(circle, rgba(255,235,190,1) 0%, rgba(255,150,70,1) 45%, rgba(255,80,40,0.9) 100%);');
      boom.animate([
        { transform: 'translate(-50%,-50%) scale(0.6)', opacity: 1,
          boxShadow: '0 0 0 0 rgba(255,90,40,0.95)' },
        { transform: 'translate(-50%,-50%) scale(' + (6 * m) + ')', opacity: 0.85,
          boxShadow: '0 0 60px 30px rgba(255,70,25,0.8)' },
        { transform: 'translate(-50%,-50%) scale(' + (10 * m) + ')', opacity: 0,
          boxShadow: '0 0 90px 50px rgba(255,60,20,0)' }
      ], { duration: 620, easing: 'cubic-bezier(0.2,0,0.4,1)' })
        .onfinish = function () { boom.remove(); };

      // Expanding shockwave ring
      const ring = effect(at + 'width:20px;height:20px;border-radius:50%;z-index:2;' +
        'border:3px solid rgba(255,190,120,0.95);');
      ring.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, borderWidth: '4px' },
        { transform: 'translate(-50%,-50%) scale(' + (16 * m) + ')', opacity: 0, borderWidth: '1px' }
      ], { duration: 700, easing: 'cubic-bezier(0.1,0.6,0.3,1)' })
        .onfinish = function () { ring.remove(); };

      // Spark shrapnel fanning away from the struck edge
      const SPARKS = Math.round(9 + 5 * m);
      for (let i = 0; i < SPARKS; i++) {
        const size = 4 + Math.round(4 * m);
        const spark = effect(at + 'width:' + size + 'px;height:' + size + 'px;' +
          'border-radius:50%;z-index:3;' +
          'background:' + (i % 3 === 0 ? 'rgba(255,220,150,1)' : 'rgba(255,120,55,1)') + ';');
        const spread = Math.PI * 0.9;
        const base = atTop ? Math.PI / 2 : -Math.PI / 2;
        const ang = base + (i / (SPARKS - 1) - 0.5) * spread;
        const dist = (70 + 130 * m) * (0.55 + ((i * 7919) % 100) / 220);
        const sx = Math.cos(ang) * dist;
        const sy = Math.sin(ang) * dist;
        spark.animate([
          { transform: 'translate(-50%,-50%) translate(0,0) scale(1)', opacity: 1 },
          { transform: 'translate(-50%,-50%) translate(' + sx + 'px,' + sy + 'px) scale(0.2)', opacity: 0 }
        ], { duration: 520 + (i % 4) * 90, easing: 'cubic-bezier(0.15,0.6,0.35,1)' })
          .onfinish = function () { spark.remove(); };
      }

      // Flash along the struck edge
      const flash = effect('left:0;right:0;height:10px;z-index:1;' +
        (atTop ? 'top:0;' : 'bottom:0;') +
        'background:linear-gradient(' + (atTop ? '180deg' : '0deg') +
        ', rgba(255,140,60,' + (0.75 * m) + '), rgba(255,140,60,0));');
      flash.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, easing: 'ease-out' })
        .onfinish = function () { flash.remove(); };
    }

    // ---------- Blocked launch: counter energy discharge ----------
    // Firing into an end the page already rests against: the bar drains to
    // gray and the energy shudders back through it instead of flying.
    function rejectDischarge(power, blockedUp) {
      const totalDur = 500 + 400 * power;

      track.style.background =
        'linear-gradient(180deg, rgba(190, 190, 200, 0.42), rgba(150, 150, 162, 0.16))';
      track.style.borderColor = 'rgba(200, 200, 210, 0.35)';
      track.style.boxShadow = '0 0 10px rgba(180, 180, 190, 0.35)';
      thumb.style.background =
        'linear-gradient(180deg, rgba(222, 222, 230, 0.5), rgba(160, 160, 172, 0.35))';
      thumb.style.boxShadow = '0 0 10px rgba(185, 185, 195, 0.5)';

      const flashes = 3 + Math.round(3 * power);
      const frames = [{ opacity: 1 }];
      for (let i = 0; i < flashes; i++) {
        frames.push({ opacity: 0.15 + 0.5 * (i / flashes) });
        frames.push({ opacity: 1 - 0.3 * (i / flashes) });
      }
      frames.push({ opacity: 1 });
      track.animate(frames, { duration: totalDur, easing: 'ease-out' });

      const r = track.getBoundingClientRect();
      const waveH = Math.max(30, r.height * 0.24);
      const wave = effect('left:' + r.left + 'px;width:' + r.width + 'px;' +
        'height:' + waveH + 'px;border-radius:8px;z-index:1;' +
        'top:' + (blockedUp ? r.top : (r.bottom - waveH)) + 'px;' +
        'background:linear-gradient(' + (blockedUp ? '180deg' : '0deg') +
        ', rgba(215, 215, 224, 0.9), rgba(215, 215, 224, 0));');
      const travel = (r.height - waveH) * (blockedUp ? 1 : -1);
      wave.animate([
        { transform: 'translateY(0)', opacity: 0.9 },
        { transform: 'translateY(' + travel + 'px)', opacity: 0 }
      ], { duration: totalDur, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' })
        .onfinish = function () { wave.remove(); };

      clearTimeout(restoreTimer);
      restoreTimer = setTimeout(function () {
        track.style.background = '';
        track.style.borderColor = '';
        track.style.boxShadow = '';
        thumb.style.background = '';
        thumb.style.boxShadow = '';
        scheduleHideBar();
      }, totalDur + 120);
    }

    // ---------- Flight ----------
    // Launches at full speed and decelerates smoothly to a dead stop exactly
    // at the landing point. No overshoot, no bounce.
    function kineticEase(p) {
      const q = 1 - p;
      return 1 - q * q * q;
    }

    // A site wide `scroll-behavior: smooth` would turn every frame's
    // scrollTo into its own smooth scroll, so it is paused during flight
    function forceInstantScroll() {
      if (savedScrollBehavior === null) {
        savedScrollBehavior = docEl.style.scrollBehavior;
        docEl.style.scrollBehavior = 'auto';
      }
    }

    function restoreScrollBehavior() {
      if (savedScrollBehavior !== null) {
        docEl.style.scrollBehavior = savedScrollBehavior;
        savedScrollBehavior = null;
      }
    }

    function paintKnobWhite(w) {
      thumb.style.background =
        'linear-gradient(180deg, rgba(255, 255, 255, ' + (0.34 + 0.55 * w) + '), ' +
        'rgba(255, 255, 255, ' + (0.16 + 0.5 * w) + '))';
      thumb.style.boxShadow =
        '0 0 ' + (8 + 20 * w) + 'px rgba(255, 255, 255, ' + (0.55 * w) + '), ' +
        'inset 0 1px 0 rgba(255, 255, 255, 0.45)';
      thumb.style.filter = 'brightness(' + (1 + 0.35 * w) + ')';
    }

    function coolKnob() {
      thumb.style.background = '';
      thumb.style.boxShadow = '';
      thumb.style.filter = '';
    }

    // Collision squish: the knob compresses against the end it just hit
    function knobImpactSquish(hitTop, speed) {
      const m = Math.min(Math.max((speed || 0) / 6000, 0.5), 1);
      const amt = 0.12 + 0.10 * m;
      thumb.style.transformOrigin = hitTop ? 'center top' : 'center bottom';
      thumb.animate([
        { transform: 'scaleY(1) scaleX(1)' },
        { transform: 'scaleY(' + (1 - amt) + ') scaleX(' + (1 + amt * 0.6) + ')' },
        { transform: 'scaleY(1) scaleX(1)' }
      ], { duration: 320, easing: 'ease-out' })
        .onfinish = function () { thumb.style.transformOrigin = ''; };
    }

    function launch(power, goingUp) {
      const dir = goingUp ? -1 : 1;
      const maxScroll = Math.max(1, docHeight() - window.innerHeight);
      const distance = Math.pow(power, 1.15) * o.maxTravel * maxScroll;

      flingFrom = window.scrollY;
      flingTarget = flingFrom + dir * distance;
      flingDur = o.flightMinMs + power * (o.flightMaxMs - o.flightMinMs);
      flingStartT = 0;
      flingPrevY = flingFrom;
      flingPrevT = 0;

      flingWhite = 0.35 + 0.65 * power;
      paintKnobWhite(flingWhite);

      forceInstantScroll();
      flinging = true;
      flightRAF = requestAnimationFrame(flingFrame);
    }

    function endFlight() {
      if (!flinging) return;
      flinging = false;
      if (flightRAF) cancelAnimationFrame(flightRAF);
      flightRAF = null;
      coolKnob();
      restoreScrollBehavior();
      scheduleHideBar();
    }

    function flingFrame(t) {
      flightRAF = null;
      if (!flinging) return;
      if (!flingStartT) { flingStartT = t; flingPrevT = t; }

      const p = Math.min((t - flingStartT) / flingDur, 1);
      const desired = flingFrom + (flingTarget - flingFrom) * kineticEase(p);

      const maxScroll = Math.max(0, docHeight() - window.innerHeight);
      const clamped = Math.min(Math.max(desired, 0), maxScroll);

      const dt = Math.max((t - flingPrevT) / 1000, 0.001);
      const speed = Math.abs(clamped - flingPrevY) / dt;

      window.scrollTo(window.scrollX, clamped);
      updateThumb();

      // Whiteness tracks the remaining speed, reaching resting gray as the flight stops
      const speedFrac = (1 - p) * (1 - p);
      paintKnobWhite(flingWhite * speedFrac);

      // Slammed into an end of the page mid flight
      if (clamped !== desired && speed >= o.impactSpeed) {
        const hitTop = desired < clamped;
        lastCollision = hitTop ? 'top' : 'bottom';
        if (o.explosions) spawnImpact(hitTop, speed);
        knobImpactSquish(hitTop, speed);
        endFlight();
        return;
      }

      flingPrevY = clamped;
      flingPrevT = t;

      if (p >= 1) {
        endFlight();
        return;
      }

      flightRAF = requestAnimationFrame(flingFrame);
    }

    // ---------- Gesture state machine ----------
    function isIgnored(el) {
      if (!el || !el.closest || !o.ignore) return false;
      try {
        return !!el.closest(o.ignore);
      } catch (err) {
        return false; // an invalid selector from the host site must not break the page
      }
    }

    function resetGesture() {
      clearTimeout(holdTimer);
      holdTimer = null;
      pointerId = null;
      const wasCharging = state === 'charging';
      clearChargeVisuals();
      if (wasCharging) scheduleHideBar();
      state = 'idle';
      unlockPage();
    }

    function onPointerDown(e) {
      // Any new touch or click grabs a flying page to a stop
      if (flinging) endFlight();

      if (!isEnabled()) return;
      if (o.pointerTypes.indexOf(e.pointerType) === -1) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (!e.isPrimary || pointerId !== null) return;
      if (isIgnored(e.target)) return;

      // No tap zone: a padded border around the whole viewport perimeter
      const pad = o.edgePadding;
      if (e.clientX < pad || e.clientX > window.innerWidth - pad ||
          e.clientY < pad || e.clientY > window.innerHeight - pad) {
        return;
      }

      pointerId = e.pointerId;
      state = 'pending';
      startX = curX = e.clientX;
      startY = curY = e.clientY;
      lockPage();

      anchor.style.left = startX + 'px';
      anchor.style.top = startY + 'px';
      anchor.style.opacity = '';
      anchor.classList.add('pending');

      holdTimer = setTimeout(function () {
        state = 'charging';
        holdArmedT = performance.now();
        anchor.classList.remove('pending');
        anchor.classList.add('armed');
        track.classList.add('charging');
        const sel = window.getSelection && window.getSelection();
        if (sel && sel.removeAllRanges) sel.removeAllRanges();
        showBar();
        startBreathing();
      }, o.holdMs);
    }

    function onPointerMove(e) {
      if (e.pointerId !== pointerId) return;
      curX = e.clientX;
      curY = e.clientY;

      // Drifting during the hold means a normal scroll, not a summon.
      // While charging, the breathing loop reads the finger every frame.
      if (state === 'pending' && Math.hypot(curX - startX, curY - startY) > o.moveTolerance) {
        resetGesture();
      }
    }

    function onPointerUp(e) {
      if (e.pointerId !== pointerId) return;

      if (state === 'charging') {
        const power = currentPower;
        const goingUp = flyUp === true;
        resetGesture();
        if (power >= o.minPower) {
          const maxScroll = Math.max(0, docHeight() - window.innerHeight);
          const blockedUp = goingUp && window.scrollY <= 2;
          const blockedDown = !goingUp && window.scrollY >= maxScroll - 2;
          showBar();
          if (blockedUp || blockedDown) {
            rejectDischarge(power, goingUp);
          } else {
            launch(power, goingUp);
          }
        }
        return;
      }

      resetGesture();
    }

    function onPointerCancel(e) {
      if (e.pointerId !== pointerId) return;
      resetGesture();
    }

    // While charging, block native scrolling so the pull loads the sling
    function onTouchMove(e) {
      if (state === 'charging' && e.cancelable) e.preventDefault();
    }

    // Long press menus and text selection are blocked only mid gesture
    function onContextMenu(e) {
      if (state !== 'idle') e.preventDefault();
    }

    function onSelectStart(e) {
      if (state !== 'idle') e.preventDefault();
    }

    function onScroll() {
      if (track.classList.contains('visible') && !flinging) updateThumb();
    }

    function onInterrupt() {
      if (flinging) endFlight();
    }

    function onReducedMotionChange() {
      if (!isEnabled()) halt();
    }

    function halt() {
      resetGesture();
      endFlight();
      clearTimeout(restoreTimer);
      track.classList.remove('visible');
    }

    on(document, 'pointerdown', onPointerDown);
    on(document, 'pointermove', onPointerMove);
    on(document, 'pointerup', onPointerUp);
    on(document, 'pointercancel', onPointerCancel);
    on(document, 'touchmove', onTouchMove, { passive: false });
    on(document, 'contextmenu', onContextMenu);
    on(document, 'selectstart', onSelectStart);
    on(window, 'scroll', onScroll, { passive: true });
    on(window, 'resize', updateThumb);
    on(window, 'wheel', onInterrupt, { passive: true });
    on(window, 'keydown', onInterrupt);
    if (reducedMotion && reducedMotion.addEventListener) {
      on(reducedMotion, 'change', onReducedMotionChange);
    }

    if (document.body) {
      mount();
    } else {
      on(document, 'DOMContentLoaded', mount);
    }

    const instance = {
      destroy: function () {
        if (destroyed) return;
        halt();
        destroyed = true;
        clearTimeout(hideTimer);
        listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); });
        listeners.length = 0;
        host.remove();
        if (ownsLockStyle) lockStyle.remove();
        if (active === instance) active = null;
      },
      enable: function () {
        userEnabled = true;
      },
      disable: function () {
        userEnabled = false;
        halt();
      },
      isEnabled: isEnabled
    };
    return instance;
  }

  // One catapult per page: the gesture listens at the document level, so a
  // second instance would fight the first. init() replaces any existing one.
  function init(options) {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return inertInstance(); // server side rendering: nothing to attach to
    }
    if (active) active.destroy();
    active = create(options);
    return active;
  }

  function destroy() {
    if (active) active.destroy();
  }

  return {
    version: VERSION,
    defaults: DEFAULTS,
    init: init,
    destroy: destroy
  };
});
