/**
 * Connects page scroll to the 3D scene with GSAP ScrollTrigger.
 *  - Hero: as you scroll past it, the loop shrinks, moves to a corner and
 *    fades into a backdrop (state.hero 0 -> 1).
 *  - Whole page: a slow drift of the camera and loop (state.page 0 -> 1),
 *    so each section is seen from a slightly different angle.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function connectScroll(world) {
  const { state } = world;
  // Tweens with `scrub` smooth out wheel steps, so the scene glides.
  gsap.to(state, {
    hero: 1,
    ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 0.6 },
  });
  gsap.to(state, {
    page: 1,
    ease: 'none',
    scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 1.2 },
  });
}

/**
 * Reduced motion: no scrubbed movement. The loop simply switches to its
 * faded backdrop state (labels hidden) once you scroll past the hero, and
 * back when you return, with one still frame each time.
 */
export function connectStaticScroll(world) {
  const { state } = world;
  const hero = document.getElementById('hero');
  let raf = 0;
  const update = () => {
    raf = 0;
    const past = window.scrollY > (hero?.offsetHeight || window.innerHeight) * 0.45 ? 1 : 0;
    if (past === state.hero) return;
    state.hero = past;
    state.page = past ? 0.5 : 0;
    world.renderOnce();
  };
  window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
  window.addEventListener('resize', () => world.renderOnce());
  update();
}
