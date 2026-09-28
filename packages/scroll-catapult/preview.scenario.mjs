// Preview gesture for `npm run record -- scroll-catapult`: hold the "how to"
// panel, flick up to full tension, release, and fly down the page into the
// bottom. The clip opens at near full tension and ends as the blast fades.

export const poster = 0.2; // seconds into the clip: full tension

export default async function ({ touch, sleep, evalJs, markStart, markEnd }) {
  // Press in the middle of the "how to" panel (not an ignored element)
  const start = await evalJs(`(() => {
    const p = document.querySelectorAll('.panel')[1].getBoundingClientRect();
    return { x: Math.round(p.left + p.width / 2), y: Math.round(p.top + p.height / 2) };
  })()`);

  // Note when the first impact effect appears, to end the clip right after it
  await evalJs(`(() => {
    window.__fxT = 0;
    const h = document.querySelector('scroll-catapult');
    new MutationObserver(() => { if (!window.__fxT) window.__fxT = Date.now(); })
      .observe(h.shadowRoot, { childList: true });
  })()`);

  await sleep(500);
  await touch('touchStart', start.x, start.y);
  await sleep(450);                 // hold: ring appears, bar summons
  const PULL = 175;                 // past the full power draw
  const STEPS = 12;                 // quick flick up to aim down the page
  let marked = false;
  for (let i = 1; i <= STEPS; i++) {
    const ease = 1 - Math.pow(1 - i / STEPS, 2);
    await touch('touchMove', start.x, start.y - PULL * ease);
    if (!marked && ease >= 0.7) { markStart(); marked = true; } // almost full tension
    await sleep(16);
  }
  await sleep(300);                 // a beat at full charge before letting go
  await touch('touchEnd');
  await sleep(2200);                // flight and impact

  const fxT = (await evalJs('window.__fxT')) / 1000;
  if (!fxT) throw new Error('no impact recorded: the explosion did not fire');
  markEnd(fxT + 0.8);               // explosion fully faded
}
