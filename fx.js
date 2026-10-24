/**
 * Small motion details that make the page feel alive:
 *  - scroll progress line under the top bar
 *  - section titles "decode" from random characters when they appear
 *  - magnetic buttons and a soft cursor ring (mouse only)
 *  - endless tool marquee
 *  - a tiny toast helper
 * All of it is skipped (or reduced to the final state) with reduced motion.
 */
const GLYPHS = '!<>-_\\/[]{}=+*^?#01ABCDEF$';

export function toast(text) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 2200);
}

function progress() {
  const bar = document.getElementById('progressBar');
  if (!bar) return;
  let raf = 0;
  const update = () => {
    raf = 0;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
  };
  window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
  window.addEventListener('resize', update);
  update();
}

function scramble(el) {
  const final = el.textContent;
  el.setAttribute('aria-label', final);
  const chars = [...final];
  const dur = 900;
  const t0 = performance.now();
  const tick = (now) => {
    const p = Math.min(1, (now - t0) / dur);
    const revealed = Math.floor(chars.length * p);
    el.textContent = chars.map((ch, i) => {
      if (i < revealed || ch === ' ') return ch;
      return GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }).join('');
    if (p < 1) requestAnimationFrame(tick);
    else { el.textContent = final; el.removeAttribute('aria-label'); }
  };
  requestAnimationFrame(tick);
}

function scrambleTitles() {
  const titles = document.querySelectorAll('.sec-head h2, .dispatch h2');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      setTimeout(() => scramble(e.target), 180);
    });
  }, { threshold: 0.8 });
  titles.forEach((t) => io.observe(t));
}

function magnetic() {
  document.querySelectorAll('.btn.primary, .btn.icon, .kbar-btn, .run-btn').forEach((el) => {
    const strength = el.classList.contains('icon') ? 0.35 : 0.22;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * strength;
      const y = (e.clientY - (r.top + r.height / 2)) * strength;
      el.style.translate = `${x}px ${y}px`;
    });
    el.addEventListener('pointerleave', () => { el.style.translate = ''; });
  });
}

function cursor() {
  const ring = document.getElementById('cursor');
  if (!ring) return;
  document.documentElement.classList.add('has-cursor');
  let x = -100; let y = -100; let cx = x; let cy = y; let raf = 0;
  const loop = () => {
    cx += (x - cx) * 0.22; cy += (y - cy) * 0.22;
    ring.style.transform = `translate(${cx}px, ${cy}px)`;
    raf = Math.abs(x - cx) + Math.abs(y - cy) > 0.3 ? requestAnimationFrame(loop) : 0;
  };
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY;
    ring.classList.add('on');
    const hot = e.target.closest('a, button, input, .orb, [role="option"]');
    ring.classList.toggle('hot', !!hot);
    ring.classList.toggle('text', !!e.target.closest('input, .term-body'));
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
  document.addEventListener('pointerleave', () => ring.classList.remove('on'));
  window.addEventListener('pointerdown', () => ring.classList.add('press'));
  window.addEventListener('pointerup', () => ring.classList.remove('press'));
}

function marquee({ reduced }) {
  const track = document.getElementById('marquee');
  if (!track) return;
  // Two copies side by side make the loop seamless.
  track.innerHTML += track.innerHTML;
  if (reduced) track.classList.add('still');
}

export function initFx({ reduced, mobile }) {
  progress();
  marquee({ reduced });
  if (reduced) return;
  scrambleTitles();
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fine && !mobile) { magnetic(); cursor(); }
}
