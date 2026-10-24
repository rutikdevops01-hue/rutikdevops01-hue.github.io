/**
 * Terminal-style boot screen.
 * Types a few lines while the 3D scene is created, then fades out.
 */
const LINES = [
  '$ ssh rutik@portfolio',
  'booting cloud-agent...',
  'loading pipeline: plan → design → provision → secure → deploy → operate → monitor → optimize',
  'compiling shaders ...',
];

export function startLoader({ reduced = false } = {}) {
  const root = document.getElementById('boot');
  const log = document.getElementById('bootLog');
  const started = performance.now();
  let i = 0;
  let timer = 0;

  const addLine = (text, cls = '') => {
    const line = document.createElement('span');
    line.className = `bl ${cls}`;
    line.textContent = text;
    log.appendChild(line);
  };

  if (!reduced) {
    timer = setInterval(() => {
      if (i < LINES.length) addLine(LINES[i++]);
      else clearInterval(timer);
    }, 210);
  }

  /** Finish booting: print the last line and fade out. */
  async function finish({ minTime = 1.1, ok = true } = {}) {
    if (reduced || !root) { root?.remove(); return; }
    const wait = Math.max(0, minTime * 1000 - (performance.now() - started));
    await new Promise((r) => setTimeout(r, wait));
    clearInterval(timer);
    while (i < LINES.length) addLine(LINES[i++]);
    addLine(ok ? 'ops-agent online ✓' : 'WebGL unavailable → loading 2D view', ok ? 'ok' : 'warn');
    await new Promise((r) => setTimeout(r, 380));
    root.classList.add('done');
    await new Promise((r) => setTimeout(r, 520));
    root.remove();
  }

  return { finish };
}
