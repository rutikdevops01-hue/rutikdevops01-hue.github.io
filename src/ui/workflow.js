/**
 * Contact "Run workflow" button: plays a short pipeline run that ends in a
 * green success state with the email link.
 */
import { setIcon } from './icons.js';

export function initWorkflow({ reduced }) {
  const btn = document.getElementById('runWorkflow');
  const stepsEl = document.getElementById('wfSteps');
  const done = document.getElementById('wfDone');
  if (!btn) return;
  const steps = [...stepsEl.querySelectorAll('[data-step]')];
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
  let running = false;

  btn.addEventListener('click', async () => {
    if (running) return;
    running = true;
    btn.disabled = true;
    done.hidden = true;
    stepsEl.hidden = false;
    steps.forEach((s) => { s.className = ''; setIcon(s.querySelector('.si'), 'queued'); });
    for (const s of steps) {
      s.className = 'running';
      setIcon(s.querySelector('.si'), 'run');
      await wait(650);
      s.className = 'done';
      setIcon(s.querySelector('.si'), 'pass');
    }
    await wait(200);
    done.hidden = false;
    btn.lastChild.textContent = 'Re-run workflow';
    btn.disabled = false;
    running = false;
  });
}
