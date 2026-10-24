/**
 * Command palette (Ctrl+K / ⌘K): jump to any section or run a quick action.
 * Arrow keys move, Enter runs, Esc closes. Focus returns to where it was.
 */
import { toast } from './fx.js';

const EMAIL = 'rutiksankapal98@gmail.com';

export function initPalette({ terminal }) {
  const dlg = document.getElementById('kbar');
  const input = document.getElementById('kbarIn');
  const list = document.getElementById('kbarList');
  const openBtn = document.getElementById('kbarOpen');
  if (!dlg || !input || !list) return;

  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  document.querySelectorAll('[data-kbd]').forEach((k) => { k.textContent = isMac ? '⌘K' : 'Ctrl K'; });

  const go = (id) => () => {
    const sec = document.getElementById(id);
    if (!sec) return;
    sec.scrollIntoView({ behavior: 'smooth' });
    // Move focus to the section title so keyboard users continue from there.
    const h = sec.querySelector('h2');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  };
  const runInShell = (cmd) => () => {
    document.getElementById('shell')?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => terminal?.run(cmd), 650);
  };
  const ITEMS = [
    { group: 'Go to', label: 'About', hint: '~/about', act: go('about') },
    { group: 'Go to', label: 'Skills', hint: '~/skills', act: go('skills') },
    { group: 'Go to', label: 'Experience', hint: '~/experience', act: go('experience') },
    { group: 'Go to', label: 'Ops dashboard', hint: '~/metrics', act: go('ops') },
    { group: 'Go to', label: 'Projects', hint: '~/projects', act: go('projects') },
    { group: 'Go to', label: 'Tech stack', hint: '~/stack', act: go('stack') },
    { group: 'Go to', label: 'Terminal', hint: '~/shell', act: go('shell') },
    { group: 'Go to', label: 'Contact', hint: '~/contact', act: go('contact') },
    { group: 'Actions', label: 'Download CV', hint: 'resume.pdf', act: () => { const a = document.createElement('a'); a.href = 'resume.pdf'; a.download = ''; a.click(); } },
    { group: 'Actions', label: 'Copy email address', hint: EMAIL, act: async () => { try { await navigator.clipboard.writeText(EMAIL); toast('Email copied to clipboard'); } catch { window.location.href = `mailto:${EMAIL}`; } } },
    { group: 'Actions', label: 'Send an email', hint: 'mailto', act: () => { window.location.href = `mailto:${EMAIL}`; } },
    { group: 'Actions', label: 'Open GitHub', hint: 'github.com/YOUR_GITHUB_USERNAME', act: () => window.open('https://github.com/YOUR_GITHUB_USERNAME', '_blank', 'noopener') },
    { group: 'Actions', label: 'Open LinkedIn', hint: 'in/rutik-sankapal', act: () => window.open('https://www.linkedin.com/in/rutik-sankapal', '_blank', 'noopener') },
    { group: 'Terminal', label: 'Run ./dr-drill.sh', hint: 'shell', act: runInShell('./dr-drill.sh') },
    { group: 'Terminal', label: 'cat certs', hint: 'shell', act: runInShell('cat certs') },
    { group: 'Terminal', label: 'gh run list (live deploys)', hint: 'shell', act: runInShell('gh run list') },
  ];

  let shown = ITEMS;
  let active = 0;
  let lastFocus = null;

  function render() {
    const q = input.value.trim().toLowerCase();
    shown = ITEMS.filter((it) => !q || `${it.label} ${it.hint} ${it.group}`.toLowerCase().includes(q));
    active = Math.min(active, Math.max(0, shown.length - 1));
    let group = '';
    list.innerHTML = '';
    shown.forEach((it, i) => {
      if (it.group !== group) {
        group = it.group;
        const g = document.createElement('li');
        g.className = 'kbar-group'; g.setAttribute('role', 'presentation'); g.textContent = group;
        list.appendChild(g);
      }
      const li = document.createElement('li');
      li.id = `kopt-${i}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(i === active));
      li.innerHTML = '<span class="kl"></span><span class="kh"></span>';
      li.querySelector('.kl').textContent = it.label;
      li.querySelector('.kh').textContent = it.hint;
      li.addEventListener('pointermove', () => { if (active !== i) { active = i; mark(); } });
      li.addEventListener('click', () => choose(i));
      list.appendChild(li);
    });
    if (!shown.length) list.innerHTML = '<li class="kbar-empty" role="presentation">No matches</li>';
    mark();
  }
  function mark() {
    list.querySelectorAll('[role="option"]').forEach((li) => li.setAttribute('aria-selected', String(li.id === `kopt-${active}`)));
    const cur = document.getElementById(`kopt-${active}`);
    if (cur) { input.setAttribute('aria-activedescendant', cur.id); cur.scrollIntoView({ block: 'nearest' }); }
  }
  function open() {
    lastFocus = document.activeElement;
    dlg.hidden = false;
    requestAnimationFrame(() => dlg.classList.add('open'));
    input.value = ''; active = 0; render();
    input.focus();
  }
  function close(restore = true) {
    dlg.classList.remove('open');
    setTimeout(() => { dlg.hidden = true; }, 160);
    if (restore) lastFocus?.focus?.({ preventScroll: true });
  }
  function choose(i) {
    const it = shown[i];
    if (!it) return;
    close(it.group !== 'Go to');
    setTimeout(it.act, 80);
  }

  openBtn?.addEventListener('click', open);
  window.addEventListener('keydown', (e) => {
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); dlg.hidden ? open() : close(); }
    else if (e.key === '/' && dlg.hidden && !/input|textarea/i.test(document.activeElement?.tagName)) { e.preventDefault(); open(); }
  });
  input.addEventListener('input', () => { active = 0; render(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % Math.max(1, shown.length); mark(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + shown.length) % Math.max(1, shown.length); mark(); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(active); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'Tab') { e.preventDefault(); } // keep focus inside the dialog
  });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
}
