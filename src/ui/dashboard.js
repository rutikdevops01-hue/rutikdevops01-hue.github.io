/**
 * "Ops at a glance" Grafana-style board, plus count-up numbers site-wide.
 *  - [data-count] numbers count up the first time they are seen.
 *  - A canvas time series scrolls like a live panel (demo data).
 *  - A Loki-style log tail streams deploy lines (demo data).
 * Everything pauses while off screen, and is static with reduced motion.
 */
const COLORS = { ok: '#3DDC97', run: '#F5B544', fail: '#FF5CCB', grid: 'rgba(150,175,205,0.10)', axis: '#5E6A7C' };

export function initCountUps({ reduced }) {
  const els = [...document.querySelectorAll('[data-count]')];
  if (reduced || !els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const el = e.target;
      const to = Number(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      // Hero numbers wait for the intro text to land.
      const delay = el.closest('.hero') ? 1700 : 150;
      const dur = 1300;
      setTimeout(() => {
        const t0 = performance.now();
        const tick = (now) => {
          const p = Math.min(1, (now - t0) / dur);
          const v = Math.round(to * (1 - Math.pow(1 - p, 3)));
          el.textContent = `${v}${p === 1 ? suffix : ''}`;
          if (p < 1) requestAnimationFrame(tick);
        };
        el.textContent = '0';
        requestAnimationFrame(tick);
      }, delay);
    });
  }, { threshold: 0.6 });
  els.forEach((el) => io.observe(el));
}

function makeSeries(n) {
  // Pipeline runs per minute: mostly successes, some running, rare failures.
  const pts = [];
  let base = 8;
  for (let i = 0; i < n; i++) pts.push(nextPoint());
  function nextPoint() {
    base = Math.max(6, Math.min(12, base + (Math.random() - 0.5) * 2));
    const ok = Math.max(1, base + Math.sin(pts.length / 4) * 1.5);
    const run = Math.max(0, 1.5 + Math.random() * 2);
    const fail = Math.random() < 0.035 ? 1.5 + Math.random() * 1.5 : 0;
    return { ok, run, fail };
  }
  return { pts, nextPoint };
}

function initGraph(canvas, { reduced }) {
  const ctx = canvas.getContext('2d');
  const N = 48;
  const series = makeSeries(N);
  let w = 0;
  let h = 0;
  let shift = 0; // 0..1 sub-step scroll
  let running = false;
  let last = 0;

  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    w = r.width; h = r.height;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function draw() {
    if (!w) return;
    ctx.clearRect(0, 0, w, h);
    const padL = 26; const padB = 16; const padT = 8;
    const gw = w - padL; const gh = h - padB - padT;
    const max = 16;
    ctx.font = '10px JetBrains Mono, ui-monospace, monospace';
    ctx.fillStyle = COLORS.axis;
    ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 1;
    for (let v = 0; v <= max; v += 4) {
      const y = padT + gh - (v / max) * gh;
      ctx.beginPath(); ctx.moveTo(padL, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke();
      ctx.fillText(String(v), 2, y + 3);
    }
    const step = gw / (N - 2);
    const x = (i) => padL + (i - shift) * step;
    const y = (v) => padT + gh - (v / max) * gh;
    const line = (key, color, fill) => {
      ctx.beginPath();
      series.pts.forEach((p, i) => { const px = x(i); const py = y(p[key]); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
      if (fill) {
        ctx.lineTo(x(series.pts.length - 1), y(0)); ctx.lineTo(x(0), y(0)); ctx.closePath();
        const g = ctx.createLinearGradient(0, padT, 0, padT + gh);
        g.addColorStop(0, `${color}55`); g.addColorStop(1, `${color}00`);
        ctx.fillStyle = g; ctx.fill();
        ctx.beginPath();
        series.pts.forEach((p, i) => { const px = x(i); const py = y(p[key]); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
      }
      ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.stroke();
    };
    ctx.save();
    ctx.beginPath(); ctx.rect(padL, 0, gw, h); ctx.clip();
    line('ok', COLORS.ok, true);
    line('run', COLORS.run, false);
    // Failures as short bars (each one was rolled back).
    ctx.fillStyle = COLORS.fail;
    series.pts.forEach((p, i) => { if (p.fail) ctx.fillRect(x(i) - 1.5, y(p.fail), 3, y(0) - y(p.fail)); });
    ctx.restore();
    // Live edge marker
    const lp = series.pts[series.pts.length - 2];
    ctx.fillStyle = COLORS.ok;
    ctx.beginPath(); ctx.arc(x(series.pts.length - 2), y(lp.ok), 3, 0, Math.PI * 2); ctx.fill();
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    shift += dt / 1.1; // one data point every ~1.1 s
    if (shift >= 1) { shift -= 1; series.pts.shift(); series.pts.push(series.nextPoint()); }
    draw();
    requestAnimationFrame(frame);
  }

  new ResizeObserver(resize).observe(canvas.parentElement);
  resize();
  return {
    start() { if (reduced || running) return; running = true; last = performance.now(); requestAnimationFrame(frame); },
    stop() { running = false; },
  };
}

const LOG_TEMPLATES = [
  ['info', 'job=os-harden target=rhel msg="baseline applied" profile=cis-l1'],
  ['info', 'job=os-harden target=ubuntu msg="checklist generated" mapped=nist,iso27001'],
  ['info', 'newrelic msg="apdex within target" service=payments-api'],
  ['info', 'site24x7 msg="monitor up" region=mumbai latency=184ms'],
  ['warn', 'cloudwatch msg="cpu above 80%" instance=app-03 action=ticket'],
  ['info', 'dr-drill msg="failover complete" rto=within-target rpo=within-target'],
  ['info', 'iam msg="access review closed" role=read-only'],
  ['error', 'healthcheck msg="503 from upstream" action=escalate-l2'],
  ['info', 'incident msg="resolved" rca=attached sla=met'],
  ['info', 'inventory msg="weekly report delivered" bucket=reports versioned=true'],
  ['info', 'cost-guard msg="idle resources flagged" count=7'],
];

function initLogs(list, { reduced }) {
  const MAX = 9;
  let i = 0;
  let timer = 0;
  const stamp = () => new Date().toTimeString().slice(0, 8);
  function push(anim = true) {
    // Mostly info lines; the error + rollback pair appears together.
    const [lvl, msg] = LOG_TEMPLATES[i % LOG_TEMPLATES.length];
    i += 1;
    const li = document.createElement('li');
    li.className = `log ${lvl}${anim ? ' in' : ''}`;
    li.innerHTML = `<span class="ts">${stamp()}</span><span class="lvl">${lvl}</span><span class="msg"></span>`;
    li.querySelector('.msg').textContent = msg;
    list.appendChild(li);
    while (list.children.length > MAX) list.firstChild.remove();
  }
  for (let k = 0; k < MAX; k++) push(false);
  return {
    start() { if (reduced || timer) return; timer = setInterval(push, 1300); },
    stop() { clearInterval(timer); timer = 0; },
  };
}

export function initDashboard({ reduced }) {
  const canvas = document.getElementById('graph');
  const logs = document.getElementById('logs');
  const dash = document.querySelector('.dash');
  if (!canvas || !logs || !dash) return;
  const graph = initGraph(canvas, { reduced });
  const tail = initLogs(logs, { reduced });
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { graph.start(); tail.start(); } else { graph.stop(); tail.stop(); }
  }, { threshold: 0.15 }).observe(dash);
  // Sparklines draw themselves when the board appears.
  const sparks = dash.querySelectorAll('.spark path');
  sparks.forEach((p) => { const L = p.getTotalLength(); p.style.setProperty('--len', L); });
  new IntersectionObserver(([e], o) => { if (e.isIntersecting) { dash.classList.add('drawn'); o.disconnect(); } }, { threshold: 0.3 }).observe(dash);
}
