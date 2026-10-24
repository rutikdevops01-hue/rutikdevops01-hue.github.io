/**
 * "Ask my terminal": a small fake shell with real answers.
 *  - Type commands (Tab completes, ↑/↓ walks the history) or use the chips.
 *  - `gh repo list` and `gh run list` fetch live data from the GitHub API.
 *  - The first time it scrolls into view it types a short demo by itself.
 * Output is plain text in an aria-live log, so screen readers hear the answers.
 */
const USER = 'YOUR_GITHUB_USERNAME';
const SITE_REPO = `${USER}/${USER}.github.io`;
const EMAIL = 'rutiksankapal98@gmail.com';
const LINKEDIN = 'https://www.linkedin.com/in/rutik-sankapal';

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const c = (cls, t) => `<span class="${cls}">${esc(t)}</span>`;
const link = (href, t) => `<a href="${href}" target="_blank" rel="noopener">${esc(t)}</a>`;

function ago(iso) {
  const s = Math.max(1, (Date.now() - new Date(iso).getTime()) / 1000);
  const units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [u, n] of units) if (s >= n) { const v = Math.floor(s / n); return `${v} ${u}${v > 1 ? 's' : ''} ago`; }
  return 'just now';
}

const NEOFETCH = [
  ['  ____   ____  ', 'rutik@cloud'],
  [' |  _ \ / ___| ', '-----------'],
  [' | |_) |\___ \ ', 'Role: Cloud Solutions Associate'],
  [' |  _ <  ___) |', 'Company: NuSummit Technologies'],
  [' |_| \_\|____/ ', 'Location: Mumbai, India'],
  ['               ', 'Clouds: AWS, Azure, GCP, OCI'],
  ['               ', 'Clients: 50+ BFSI and enterprise'],
  ['               ', 'SLA: 99%+ compliance'],
  ['               ', 'Education: MCA, Mumbai'],
];

const SKILLS_YML = `clouds:       [AWS, Microsoft Azure, Google Cloud, Oracle Cloud]
iac:          [Terraform]
containers:   [Kubernetes, Docker, CI/CD fundamentals]
systems:      [RHEL, Ubuntu, Amazon Linux, Windows Server]
scripting:    [Bash, Python, PowerShell]
monitoring:   [New Relic, Site24x7, OpManager, CloudWatch]
security:     [IAM, CIS Benchmarks, STIG, NIST 800-53, ISO 27001, PCI DSS, GDPR]
operations:   [Incident management, problem management, RCA, DR/BCP, SLA]`;

const CERTS = [
  ['pass', 'AWS Certified Solutions Architect', 'Associate'],
  ['pass', 'Microsoft Certified: Azure Administrator', 'Associate'],
  ['pass', 'Google Cloud Associate Cloud Engineer', 'Associate'],
  ['pass', 'Kubernetes and Cloud Native Associate', 'KCNA'],
  ['run', 'AWS Certified DevOps Engineer', 'Professional, preparing'],
  ['run', 'Certified Kubernetes Administrator', 'CKA, preparing'],
];

const PROJECTS = [
  ['pass', 'os-hardening', 'Bash hardening for 3 operating systems', 'Bravo Award'],
  ['pass', 'dr-drills', 'Failover validated against RTO/RPO', 'in production'],
  ['pass', 'aws-inventory', 'EventBridge + Lambda + S3 + SES reports', 'done'],
  ['pass', 'ai-cloud-architect', 'Requirements to architecture diagrams', 'done'],
  ['pass', 'security-summarizer', 'Scan output to plain-language risks', 'done'],
  ['pass', 'cloud-cost-guard', 'Multi-cloud cost optimizer', 'done'],
  ['run', 'gcp-tam', 'Technical Account Manager + presales', 'ongoing'],
];

export function initTerminal({ reduced }) {
  const root = document.getElementById('term');
  const out = document.getElementById('termOut');
  const form = document.getElementById('termForm');
  const input = document.getElementById('termIn');
  const body = document.getElementById('termBody');
  if (!root || !out || !form) return null;

  const history = [];
  let hIndex = 0;
  let busy = false;
  let touched = false;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));

  const scroll = () => { body.scrollTop = body.scrollHeight; };
  function print(html, cls = '') {
    const line = document.createElement('div');
    line.className = `tl ${cls}`;
    line.innerHTML = html;
    out.appendChild(line);
    // Keep the log from growing forever.
    while (out.children.length > 160) out.firstChild.remove();
    scroll();
    return line;
  }
  const echo = (cmd) => print(`<span class="pu">rutik@cloud</span>:<span class="pp">~</span>$ ${esc(cmd)}`, 'cmdline');

  async function typeInto(cmd) {
    input.value = '';
    for (const ch of cmd) { input.value += ch; await wait(45 + Math.random() * 45); }
    await wait(220);
  }

  async function ghFetch(path) {
    const res = await fetch(`https://api.github.com/${path}`, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    return res.json();
  }

  const COMMANDS = {
    help: {
      desc: 'list commands',
      run() {
        const rows = Object.entries(COMMANDS).filter(([, v]) => v.desc).map(([k, v]) => `  ${c('k', k.padEnd(18))}${esc(v.desc)}`);
        print(`Available commands:\n${rows.join('\n')}\n\n${c('dim', 'Tab completes · ↑/↓ history · Ctrl+L clears')}`);
      },
    },
    whoami: {
      desc: 'who is this?',
      run() { print(`Rutik Sankapal. Cloud Solutions Associate at NuSummit Technologies, Mumbai.\nI run multi-cloud operations, harden servers and keep production calm.`); },
    },
    neofetch: {
      desc: 'system info, me edition',
      run() {
        const lines = NEOFETCH.map(([art, info], i) => `${c('art', art)}  ${i === 0 ? c('pu', info) : i === 1 ? c('dim', info) : info.replace(/^([^:]+):/, (m, k) => `${c('k', k)}:`)}`);
        const bar = ['#3FD8F5', '#3DDC97', '#F5B544', '#FF5CCB', '#5B8CFF', '#E8EDF4'].map((col) => `<i style="background:${col}"></i>`).join('');
        print(`${lines.join('\n')}\n${' '.repeat(17)}<span class="swatch">${bar}</span>`);
      },
    },
    'cat skills.yml': { desc: 'what I work with', run() { print(esc(SKILLS_YML).replace(/^(\w+):/gm, (m, k) => `${c('k', k)}:`)); } },
    'ls projects': {
      desc: 'projects and their status',
      run() {
        const icon = { pass: c('ok', '✓'), run: c('warn', '●') };
        print(PROJECTS.map(([s, name, what, st]) => `${icon[s]} ${c('k', name.padEnd(21))}${esc(what.padEnd(38))}${c(s === 'pass' ? 'ok' : 'warn', st)}`).join('\n'));
        print(c('dim', 'Scroll up to ~/projects for the full cards.'));
      },
    },
    experience: {
      desc: 'where I have worked',
      run() {
        print(`${c('ok', '●')} ${c('k', 'Cloud Solutions Associate')}, NuSummit Technologies   Apr 2026 – now
    GCP TAM · proposals and architecture · presales support
${c('ok', '✓')} ${c('k', 'Trainee Cloud Engineer → Cloud Engineer → Cloud Associate')}   from Jul 2024
    L1–L2 support · OS hardening · DR drills · 99%+ SLA`);
      },
    },
    'cat certs': {
      desc: 'my certifications',
      run() {
        const icon = { pass: c('ok', '✓'), run: c('warn', '●') };
        print(CERTS.map(([s, name, lvl]) => `${icon[s]} ${esc(name.padEnd(42))}${c(s === 'pass' ? 'ok' : 'warn', lvl)}`).join('\n'));
      },
    },
    'gh repo list': {
      desc: 'my public repos (live from GitHub)',
      async run() {
        const line = print(c('dim', `fetching github.com/${USER} …`));
        try {
          const repos = await ghFetch(`users/${USER}/repos?sort=updated&per_page=8`);
          line.remove();
          if (!repos.length) { print('No public repositories yet.'); return; }
          print(repos.map((r) => `${link(r.html_url, r.name)}${' '.repeat(Math.max(2, 32 - r.name.length))}${c('dim', (r.language || '—').padEnd(12))}${c('dim', `updated ${ago(r.pushed_at)}`)}`).join('\n'));
        } catch (e) {
          line.innerHTML = `${c('err', 'error:')} could not reach GitHub (${esc(e.message)}). See ${link(`https://github.com/${USER}`, `github.com/${USER}`)}`;
        }
      },
    },
    'gh run list': {
      desc: "this site's latest deploys (live)",
      async run() {
        const line = print(c('dim', 'fetching workflow runs …'));
        try {
          const data = await ghFetch(`repos/${SITE_REPO}/actions/runs?per_page=5`);
          line.remove();
          print(data.workflow_runs.map((r) => {
            const ok = r.conclusion === 'success';
            const st = r.status !== 'completed' ? c('warn', '● running ') : ok ? c('ok', '✓ success ') : c('err', `✗ ${r.conclusion} `);
            return `${st} ${link(r.html_url, r.head_sha.slice(0, 7))}  ${esc((r.display_title || r.name).slice(0, 38).padEnd(40))}${c('dim', ago(r.updated_at))}`;
          }).join('\n') || 'No runs yet.');
        } catch (e) {
          line.innerHTML = `${c('err', 'error:')} could not reach GitHub (${esc(e.message)}).`;
        }
      },
    },
    './dr-drill.sh': {
      desc: 'watch a DR drill (simulated)',
      async run() {
        const steps = [
          ['freeze', 'quiesce writes on primary region'],
          ['failover', 'promote replica in DR region'],
          ['validate', 'health checks 12/12 passed'],
          ['measure', 'RTO within target · RPO within target'],
          ['failback', 'primary restored, replication resumed'],
        ];
        for (const [name, detail] of steps) {
          const l = print(`${c('warn', '●')} ${c('k', name.padEnd(9))}${c('dim', detail)}`);
          await wait(520);
          l.innerHTML = `${c('ok', '✓')} ${c('k', name.padEnd(9))}${esc(detail)}`;
        }
        print(`${c('ok', 'drill complete')} ${c('dim', '· targets met · report generated (simulated)')}`);
      },
    },
    'cat resume': {
      desc: 'download my CV',
      run() { print(`My CV: ${link('resume.pdf', 'resume.pdf')} ${c('dim', '(opens the PDF)')}`); },
    },
    contact: {
      desc: 'how to reach me',
      run() {
        print(`email     <a href="mailto:${EMAIL}">${EMAIL}</a>\ngithub    ${link(`https://github.com/${USER}`, `github.com/${USER}`)}\nlinkedin  ${link(LINKEDIN, 'linkedin.com/in/rutik-sankapal')}`);
      },
    },
    'sudo hire rutik': {
      desc: '🙂',
      async run() {
        print('[sudo] password for recruiter: ********');
        await wait(500);
        print(`${c('ok', 'Permission granted.')} Next step: <a href="mailto:${EMAIL}?subject=Let's%20talk">email ${EMAIL}</a>`);
      },
    },
    uptime: { run() { print(`up since Jul 2024 · load average: tickets, hardening, DR drills`); } },
    date: { run() { print(new Date().toString()); } },
    history: { run() { print(history.map((h, i) => `${String(i + 1).padStart(4)}  ${esc(h)}`).join('\n') || 'empty'); } },
    clear: { desc: 'clear the screen', run() { out.innerHTML = ''; } },
  };
  // Friendly aliases.
  const ALIAS = {
    about: 'whoami', skills: 'cat skills.yml', projects: 'ls projects', ls: 'ls projects', resume: 'cat resume', cv: 'cat resume', email: 'contact', 'gh repos': 'gh repo list',
    certs: 'cat certs', certifications: 'cat certs', drill: './dr-drill.sh', 'sh dr-drill.sh': './dr-drill.sh', 'bash dr-drill.sh': './dr-drill.sh', 'hire me': 'sudo hire rutik', 'sudo hire me': 'sudo hire rutik',
  };

  async function run(raw, { typed = false } = {}) {
    const cmd = raw.trim().replace(/\s+/g, ' ');
    if (busy) return;
    busy = true;
    if (typed) await typeInto(cmd);
    input.value = '';
    echo(cmd);
    if (cmd) { history.push(cmd); hIndex = history.length; }
    const key = ALIAS[cmd.toLowerCase()] || cmd.toLowerCase();
    try {
      if (!cmd) { /* empty line */ }
      else if (COMMANDS[key]) await COMMANDS[key].run();
      else if (/^rm -rf/.test(key)) print(`${c('err', 'denied:')} production is protected by least-privilege IAM. Nice try.`);
      else if (/^echo /.test(cmd)) print(esc(cmd.slice(5)));
      else if (/^open (github|linkedin)$/.test(key)) { const u = key.endsWith('github') ? `https://github.com/${USER}` : LINKEDIN; window.open(u, '_blank', 'noopener'); print(`opening ${link(u, u)}`); }
      else if (key === 'exit' || key === 'logout') print('logout… just kidding. You can scroll on, though.');
      else if (key === 'sudo' || key.startsWith('sudo ')) print(`${c('err', 'rutik is not in the sudoers file.')} This incident will be reported. 😉 Try ${c('k', 'sudo hire rutik')}`);
      else print(`${c('err', 'command not found:')} ${esc(cmd)}. Type ${c('k', 'help')}.`);
    } finally {
      busy = false;
      scroll();
    }
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); touched = true; run(input.value); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); if (hIndex > 0) input.value = history[--hIndex]; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); hIndex = Math.min(history.length, hIndex + 1); input.value = history[hIndex] || ''; }
    else if (e.key === 'Tab' && input.value.trim()) {
      const v = input.value.toLowerCase();
      const hit = [...Object.keys(COMMANDS), ...Object.keys(ALIAS)].find((k) => k.startsWith(v));
      if (hit) { e.preventDefault(); input.value = hit; }
    } else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); out.innerHTML = ''; }
    touched = true;
  });
  body.addEventListener('click', (e) => { if (!e.target.closest('a') && !window.getSelection().toString()) input.focus({ preventScroll: true }); });
  root.querySelectorAll('[data-cmd]').forEach((b) => b.addEventListener('click', () => { touched = true; run(b.dataset.cmd, { typed: !reduced }); }));

  print(`${c('dim', 'Last login: ')}${new Date().toDateString()} ${c('dim', 'from your browser')}\nType ${c('k', 'help')} to get started.`);

  // Self-typing demo the first time the terminal is on screen.
  const io = new IntersectionObserver(async ([entry]) => {
    if (!entry.isIntersecting) return;
    io.disconnect();
    if (reduced) { await run('neofetch'); return; }
    await wait(500);
    for (const cmd of ['neofetch', 'cat certs']) {
      if (touched) return;
      await run(cmd, { typed: true });
      await wait(700);
    }
  }, { threshold: 0.45 });
  io.observe(root);

  return { run: (cmd) => run(cmd, { typed: !reduced }) };
}
