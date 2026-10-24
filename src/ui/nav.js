/** Top navigation drawn as a pipeline: sections you have passed turn green,
 *  the one you are reading glows cyan. */
export function initNav() {
  const items = [...document.querySelectorAll('#stagesNav li')];
  const sections = items.map((li) => document.getElementById(li.dataset.sec));

  function update() {
    const mark = window.scrollY + window.innerHeight * 0.35;
    let current = -1;
    sections.forEach((sec, i) => { if (sec && sec.offsetTop <= mark) current = i; });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = sections.length - 1;
    items.forEach((li, i) => {
      li.classList.toggle('passed', i < current);
      li.classList.toggle('current', i === current);
      const a = li.querySelector('a');
      if (i === current) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
}
