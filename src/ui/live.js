/**
 * Footer: shows this site's latest GitHub Actions deploy, live from the
 * GitHub API (status, commit and how long ago). Falls back to the static
 * text if the API is unreachable or rate-limited.
 */
const REPO = 'YOUR_GITHUB_USERNAME/YOUR_GITHUB_USERNAME.github.io';

function ago(iso) {
  const s = Math.max(1, (Date.now() - new Date(iso).getTime()) / 1000);
  for (const [u, n] of [['day', 86400], ['hour', 3600], ['minute', 60]]) {
    if (s >= n) { const v = Math.floor(s / n); return `${v} ${u}${v > 1 ? 's' : ''} ago`; }
  }
  return 'just now';
}

export async function initLive() {
  const el = document.getElementById('deployLive');
  if (!el || !window.fetch) return;
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/actions/runs?per_page=1`, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) return;
    const run = (await res.json()).workflow_runs?.[0];
    if (!run) return;
    const ok = run.conclusion === 'success';
    const state = run.status !== 'completed' ? 'running' : ok ? 'passed' : 'failed';
    el.innerHTML = '';
    const dot = document.createElement('span');
    dot.className = `deploy-dot ${state}`;
    dot.setAttribute('aria-hidden', 'true');
    const a = document.createElement('a');
    a.href = run.html_url; a.target = '_blank'; a.rel = 'noopener';
    a.textContent = run.head_sha.slice(0, 7);
    el.append(dot, `Last deploy ${state === 'passed' ? 'passed' : state} · `, a, ` · ${ago(run.updated_at)} via GitHub Actions`);
  } catch { /* keep the static text */ }
}
