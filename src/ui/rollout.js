/**
 * Kubernetes rolling update, drawn with plain HTML in the k3s project card.
 * Strategy: maxSurge 1, maxUnavailable 0. A new pod starts, becomes Ready,
 * then one old pod terminates. Ready stays at 6/6 the whole time.
 * Runs only while visible; with reduced motion it shows the finished state.
 */
export function initRollout({ reduced }) {
  const root = document.querySelector('[data-rollout]');
  if (!root) return;
  const podsEl = root.querySelector('[data-ro-pods]');
  const readyEl = root.querySelector('[data-ro-ready]');
  const msgEl = root.querySelector('[data-ro-msg]');
  const TOTAL = 6;
  let version = 1;
  let visible = false;
  let loopRunning = false;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const hash = () => Math.random().toString(36).slice(2, 7);

  function pod(v, state = 'ready') {
    const el = document.createElement('div');
    el.className = `pod v${(v - 1) % 3} ${state}`;
    el.dataset.v = String(v);
    el.innerHTML = `<span class="pod-dot"></span><span class="pod-name">${hash()}</span><span class="pod-v">v${v}</span>`;
    return el;
  }
  const ready = () => podsEl.querySelectorAll('.pod.ready').length;
  const setReady = () => { readyEl.textContent = String(Math.min(TOTAL, ready())); };

  for (let i = 0; i < TOTAL; i++) podsEl.appendChild(pod(version));
  setReady();
  if (reduced) { msgEl.textContent = 'deployment "demo-app" successfully rolled out'; return; }

  async function rollout() {
    const next = version + 1;
    msgEl.textContent = `rolling out v${next} (maxSurge=1, maxUnavailable=0)`;
    for (let i = 0; i < TOTAL; i++) {
      while (!visible) await sleep(300);
      const fresh = pod(next, 'pending');
      podsEl.appendChild(fresh);
      await sleep(450);
      fresh.className = fresh.className.replace('pending', 'creating');
      await sleep(700);
      fresh.className = fresh.className.replace('creating', 'ready');
      setReady();
      const old = [...podsEl.querySelectorAll('.pod.ready')].find((p) => p.dataset.v !== String(next));
      if (old) {
        old.className = old.className.replace('ready', 'terminating');
        msgEl.textContent = `${i + 1} of ${TOTAL} updated replicas are available…`;
        await sleep(600);
        old.remove();
      }
      setReady();
      await sleep(250);
    }
    version = next;
    msgEl.textContent = `deployment "demo-app" successfully rolled out`;
    root.classList.add('done');
    await sleep(3200);
    root.classList.remove('done');
  }

  async function loop() {
    if (loopRunning) return;
    loopRunning = true;
    await sleep(800);
    // Keep rolling while the card is on screen; pause otherwise.
    for (;;) { while (!visible) await sleep(400); await rollout(); }
  }

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) loop(); }, { threshold: 0.35 }).observe(root);
}
