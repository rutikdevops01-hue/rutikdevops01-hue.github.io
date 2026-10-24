/**
 * "career.yml" pipeline in the About section.
 * Four job panels float in depth, connected like a GitHub Actions graph.
 * When the section scrolls into view the run plays: each job spins, prints
 * its steps and turns green; the last job (k3s) keeps running.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { setIcon } from './icons.js';

export function initCareer({ reduced }) {
  const root = document.getElementById('career');
  if (!root) return;
  const panels = [...root.querySelectorAll('.job-panel')];
  const chip = document.getElementById('runChip');
  const runIcon = document.getElementById('runIcon');
  let tl = null;

  const setChip = (state) => {
    chip.className = `chip ${state}`;
    chip.textContent = state === 'queued' ? 'Queued' : state === 'running' ? 'In progress' : 'Success';
  };

  function finalState() {
    panels.forEach((p) => {
      p.dataset.state = p.dataset.final;
      setIcon(p.querySelector('.si'), p.dataset.final === 'done' ? 'pass' : 'run');
      gsap.set(p.querySelectorAll('.job-lines li'), { autoAlpha: 1, x: 0 });
    });
    setChip('running');
    setIcon(runIcon, 'run');
  }

  function play() {
    tl?.kill();
    panels.forEach((p) => {
      p.dataset.state = 'queued';
      setIcon(p.querySelector('.si'), 'queued');
    });
    setChip('queued');
    setIcon(runIcon, 'queued');

    tl = gsap.timeline();
    // Panels fly in from deep in the scene, one after another.
    tl.fromTo(panels,
      { autoAlpha: 0, z: -260, rotationY: -18, y: 30 },
      { autoAlpha: 1, z: 0, rotationY: 0, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.14, clearProps: 'transform' });
    tl.set(panels.flatMap((p) => [...p.querySelectorAll('.job-lines li')]), { autoAlpha: 0, x: -8 }, 0);
    tl.call(() => { setChip('running'); setIcon(runIcon, 'run'); }, null, 0.5);

    panels.forEach((p, i) => {
      const lines = p.querySelectorAll('.job-lines li');
      tl.call(() => { p.dataset.state = 'running'; setIcon(p.querySelector('.si'), 'run'); });
      tl.to(lines, { autoAlpha: 1, x: 0, duration: 0.3, stagger: 0.18, ease: 'power2.out' });
      if (p.dataset.final === 'done') {
        tl.call(() => { p.dataset.state = 'done'; setIcon(p.querySelector('.si'), 'pass'); }, null, '+=0.2');
      }
      if (i < panels.length - 1) tl.to({}, { duration: 0.12 });
    });
  }

  if (reduced) {
    finalState();
  } else {
    gsap.set(panels, { autoAlpha: 0 });
    ScrollTrigger.create({ trigger: root, start: 'top 75%', once: true, onEnter: play });
  }
  document.getElementById('rerun')?.addEventListener('click', () => (reduced ? finalState() : play()));
}
