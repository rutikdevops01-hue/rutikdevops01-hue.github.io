/**
 * Entry point.
 * 1. Decide what the device can handle (WebGL, reduced motion, phone).
 * 2. Start the boot screen and the page UI (works with or without 3D).
 * 3. Build the 3D scene, then play the intro and hook up scrolling.
 */
import gsap from 'gsap';
import { startLoader } from './ui/loader.js';
import { initUI } from './ui/index.js';
import { INTRO } from './config.js';

const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

async function boot() {
  const heroItems = document.querySelectorAll('[data-hero-item]');
  const loader = startLoader({ reduced });
  initUI({ reduced, mobile });

  const webgl = hasWebGL();
  if (!webgl) {
    // Clean 2D version: same content, static loop drawing in the hero.
    root.classList.add('no-webgl');
    await loader.finish({ minTime: 0.6, ok: false });
    return;
  }

  root.classList.add('webgl');
  if (!reduced) gsap.set(heroItems, { autoAlpha: 0 });

  let world;
  try {
    // Load the 3D code only once we know WebGL works (keeps the 2D path light).
    const [{ createScene }, intro, scroll] = await Promise.all([
      import('./scene/createScene.js'),
      import('./scene/intro.js'),
      import('./scene/scrollScene.js'),
    ]);
    world = createScene({ canvas: document.getElementById('scene'), mobile, reduced });
    world.renderOnce(); // compiles shaders behind the boot screen

    await loader.finish({ minTime: INTRO.bootMin });

    if (reduced) {
      intro.showFinalState(world, heroItems);
      scroll.connectStaticScroll(world);
    } else {
      world.startLoop();
      intro.playIntro(world, heroItems);
      scroll.connectScroll(world);
    }
  } catch (err) {
    console.warn('3D scene failed, showing the 2D version instead.', err);
    root.classList.remove('webgl');
    root.classList.add('no-webgl');
    gsap.set(heroItems, { autoAlpha: 1, y: 0 });
    world?.dispose();
    world = null;
    await loader.finish({ minTime: 0.2, ok: false });
  }

  // Free GPU memory when the page is really closed (not when it goes into the back/forward cache).
  window.addEventListener('pagehide', (e) => { if (!e.persisted) world?.dispose(); });
}

boot();
