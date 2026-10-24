/**
 * Tech stack "sphere": the tool buttons sit on a rotating 3D sphere.
 *  - Drag to spin it; it pauses while you hover or use the keyboard.
 *  - Filter tabs dim the tools outside the chosen group.
 *  - Choosing a tool shows what I use it for in the side panel.
 * The buttons are real <button>s, so keyboard and screen readers work.
 * With reduced motion the sphere stays still.
 */
export function initCloud({ reduced, mobile }) {
  const cloud = document.getElementById('cloud');
  const list = document.getElementById('cloudList');
  const detail = document.getElementById('toolDetail');
  if (!cloud || !list) return;
  const orbs = [...list.querySelectorAll('.orb')];
  const items = orbs.map((el, i) => {
    // Even spread on a sphere (Fibonacci lattice).
    const n = orbs.length;
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = Math.PI * (3 - Math.sqrt(5)) * i;
    return { el, x: Math.cos(th) * r, y, z: Math.sin(th) * r, dim: false };
  });

  // Text list for search engines and screen readers.
  const dl = document.getElementById('stackList');
  if (dl) {
    dl.innerHTML = orbs.map((o) => `<dt>${o.textContent.trim()} (${o.dataset.kind})</dt><dd>${o.dataset.desc}</dd>`).join('');
  }

  let ax = -0.35;
  let ay = 0.4;
  let vy = reduced ? 0 : 0.0035; // auto spin speed (radians per frame)
  let vx = 0;
  let paused = false;
  let visible = false;
  let radius = 160;

  function measure() {
    const w = cloud.clientWidth;
    // Leave room for the widest label on each side, so nothing hangs off the edge.
    radius = Math.max(90, Math.min(w / 2 - 78, w * 0.36, mobile ? 135 : 190));
  }

  function render() {
    const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
    const persp = radius * 3;
    for (const it of items) {
      // Rotate around Y, then X.
      const x1 = it.x * cy + it.z * sy;
      const z1 = -it.x * sy + it.z * cy;
      const y2 = it.y * cx - z1 * sx;
      const z2 = it.y * sx + z1 * cx;
      const s = persp / (persp - z2 * radius);
      const depth = (z2 + 1) / 2; // 0 back .. 1 front
      const alpha = (0.28 + depth * 0.72) * (it.dim ? 0.3 : 1);
      it.el.style.transform = `translate(-50%, -50%) translate3d(${(x1 * radius * s).toFixed(1)}px, ${(y2 * radius * s).toFixed(1)}px, 0) scale(${(s * (it.dim ? 0.82 : 1)).toFixed(3)})`;
      it.el.style.opacity = alpha.toFixed(2);
      it.el.style.zIndex = String(Math.round(depth * 100));
    }
  }

  let raf = 0;
  function loop() {
    raf = requestAnimationFrame(loop);
    if (!paused) ay += vy;
    ay += vx;
    vx *= 0.94;
    render();
  }
  const start = () => { if (!raf && visible && !reduced) raf = requestAnimationFrame(loop); };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(cloud);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  // Pause on hover / keyboard focus so a tool can be picked easily.
  cloud.addEventListener('pointerenter', () => { paused = true; });
  cloud.addEventListener('pointerleave', () => { paused = false; });
  list.addEventListener('focusin', () => { paused = true; });
  list.addEventListener('focusout', () => { paused = false; });

  // Drag to spin.
  let dragX = null;
  let moved = 0;
  cloud.addEventListener('pointerdown', (e) => { dragX = e.clientX; moved = 0; });
  window.addEventListener('pointerup', () => { dragX = null; });
  window.addEventListener('pointermove', (e) => {
    if (dragX === null) return;
    const dx = e.clientX - dragX;
    moved += Math.abs(dx);
    dragX = e.clientX;
    vx = dx * 0.0025;
    ay += dx * 0.006;
    if (reduced) render();
  });

  function show(orb) {
    orbs.forEach((o) => o.setAttribute('aria-pressed', String(o === orb)));
    detail.innerHTML = '';
    const h = document.createElement('h3');
    h.textContent = orb.textContent.trim();
    const kind = document.createElement('p');
    kind.className = 'td-kind';
    kind.textContent = orb.dataset.kind;
    const p = document.createElement('p');
    p.textContent = orb.dataset.desc;
    detail.append(kind, h, p);
  }
  orbs.forEach((o) => {
    o.setAttribute('aria-pressed', 'false');
    o.addEventListener('click', (e) => {
      if (moved > 6) { e.preventDefault(); return; } // it was a drag, not a click
      show(o);
    });
  });

  // Filters
  const filters = [...document.querySelectorAll('.filter')];
  filters.forEach((btn) => btn.addEventListener('click', () => {
    const f = btn.dataset.filter;
    filters.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    items.forEach((it) => { it.dim = f !== 'all' && it.el.dataset.cat !== f; it.el.classList.toggle('dim', it.dim); });
    render();
  }));

  window.addEventListener('resize', () => { measure(); render(); });
  measure();
  render();
  show(orbs[0]);
}
