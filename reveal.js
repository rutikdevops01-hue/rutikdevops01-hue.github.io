/**
 * Scroll reveals that make each section feel like it arrives in 3D space:
 *  - [data-reveal] blocks rise and tip forward from a slight backward tilt.
 *  - Experience cards swing in from the side, like doors on the timeline.
 *  - Project pipelines light up stage by stage.
 * Everything is visible immediately when reduced motion is on.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function initReveals({ reduced }) {
  const blocks = gsap.utils.toArray('[data-reveal]');
  const pipes = gsap.utils.toArray('.pipe');
  const xps = gsap.utils.toArray('.xp');

  if (reduced) {
    pipes.forEach((p) => p.classList.add('lit'));
    return;
  }

  gsap.set(blocks, { autoAlpha: 0, y: 46, rotationX: 14, transformPerspective: 900, transformOrigin: '50% 100%' });
  ScrollTrigger.batch(blocks, {
    start: 'top 88%',
    once: true,
    onEnter: (batch) => gsap.to(batch, {
      autoAlpha: 1, y: 0, rotationX: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08,
      clearProps: 'transform', // hand transforms back to CSS (needed for hover tilt)
    }),
  });

  xps.forEach((el) => {
    const left = el.dataset.side !== 'right';
    gsap.fromTo(el,
      { autoAlpha: 0, x: left ? -70 : 70, rotationY: left ? 28 : -28, transformPerspective: 1100 },
      {
        autoAlpha: 1, x: 0, rotationY: 0, duration: 1.1, ease: 'power3.out', clearProps: 'transform',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      });
  });

  pipes.forEach((p) => ScrollTrigger.create({ trigger: p, start: 'top 90%', once: true, onEnter: () => p.classList.add('lit') }));
}
