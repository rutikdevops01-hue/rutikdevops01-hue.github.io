/** Small status icons used across the page: passed, running and queued. */
const C = { pass: '#3DDC97', run: '#F5B544', track: 'rgba(245,181,68,.25)', queued: '#5E6A7C' };

const SVG = {
  pass: `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="${C.pass}"/><path d="M6 10.3l2.7 2.7L14.2 7.6" stroke="#06140D" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  run: `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5" stroke="${C.track}" stroke-width="2.4" fill="none"/><path d="M10 2.5a7.5 7.5 0 0 1 7.5 7.5" stroke="${C.run}" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>`,
  queued: `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5" stroke="${C.queued}" stroke-width="2" fill="none" stroke-dasharray="3 3"/></svg>`,
};

export function setIcon(el, kind) {
  el.innerHTML = SVG[kind] || SVG.queued;
  el.classList.toggle('spin', kind === 'run');
  el.dataset.icon = kind;
}

export function initIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => setIcon(el, el.dataset.icon));
}
