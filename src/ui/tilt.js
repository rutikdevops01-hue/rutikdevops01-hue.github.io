/**
 * 3D hover tilt for cards (.tilt). The card leans towards the pointer and a
 * soft highlight follows it. CSS reads the custom properties --rx, --ry,
 * --gx and --gy. Off for touch screens and reduced motion.
 */
export function initTilt({ reduced, mobile }) {
  if (reduced || mobile || !window.matchMedia('(hover: hover)').matches) return;
  const MAX = 8; // degrees

  document.querySelectorAll('.tilt').forEach((card) => {
    let raf = 0;
    let ev = null;
    const apply = () => {
      raf = 0;
      const r = card.getBoundingClientRect();
      const px = (ev.clientX - r.left) / r.width;
      const py = (ev.clientY - r.top) / r.height;
      // Bigger cards tilt less, so wide cards don't swing too far.
      const k = Math.min(1, 420 / r.width);
      card.style.setProperty('--ry', `${(px - 0.5) * 2 * MAX * k}deg`);
      card.style.setProperty('--rx', `${(0.5 - py) * 2 * MAX * k}deg`);
      card.style.setProperty('--gx', `${px * 100}%`);
      card.style.setProperty('--gy', `${py * 100}%`);
    };
    card.addEventListener('pointermove', (e) => {
      ev = e;
      if (!raf) raf = requestAnimationFrame(apply);
    });
    card.addEventListener('pointerenter', () => card.classList.add('tilting'));
    card.addEventListener('pointerleave', () => {
      cancelAnimationFrame(raf);
      raf = 0;
      card.classList.remove('tilting');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });
}
