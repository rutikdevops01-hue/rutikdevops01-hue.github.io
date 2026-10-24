/**
 * Scene setup and render loop.
 *
 * One fixed full-screen canvas sits behind the page. It holds the infinity
 * loop, a particle field and a faint grid floor. The page content is normal
 * HTML on top, so it stays readable by screen readers and search engines.
 *
 * State that drives the camera and the loop (all 0..1, set by GSAP):
 *   intro: camera fly-in progress
 *   hero:  scroll hand-off (loop shrinks and becomes a backdrop)
 *   page:  overall page scroll (slow drift while reading other sections)
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { createInfinityLoop } from './infinityLoop.js';
import { COLORS, LOOP, PARTICLES, BLOOM, CAMERA } from '../config.js';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

export function createScene({ canvas, mobile, reduced }) {
  const useBloom = !mobile && !reduced;

  /* ---------- Renderer ---------- */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !useBloom,          // bloom path renders through its own targets
    powerPreference: 'high-performance',
  });
  const pixelRatio = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(COLORS.background, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  // Use scene.background (colour-managed) rather than only the clear colour,
  // which would be gamma-encoded twice on the bloom path and look grey.
  scene.background = new THREE.Color(COLORS.background);
  scene.fog = new THREE.FogExp2(COLORS.background, 0.03);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 240);
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

  /* ---------- Labels (HTML, crisp at any size) ---------- */
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.className = 'stage-labels';
  labelRenderer.domElement.setAttribute('aria-hidden', 'true');
  document.body.appendChild(labelRenderer.domElement);

  /* ---------- The loop ---------- */
  const loop = createInfinityLoop({ mobile, reduced, bloom: useBloom });
  scene.add(loop.group);

  /* ---------- Particle field ---------- */
  const count = mobile ? PARTICLES.mobile : PARTICLES.desktop;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Points on a thick spherical shell, flattened a little vertically.
    const r = 24 + Math.random() * 50;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(ph) * Math.cos(th);
    positions[i * 3 + 1] = r * Math.cos(ph) * 0.55;
    positions[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th) - 18; // kept well behind the camera
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dot = document.createElement('canvas');
  dot.width = dot.height = 32;
  {
    const g = dot.getContext('2d');
    const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 32, 32);
  }
  const dotTex = new THREE.CanvasTexture(dot);
  const pMat = new THREE.PointsMaterial({
    color: COLORS.particles, size: mobile ? 0.2 : 0.14, map: dotTex, transparent: true,
    opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  /* ---------- Grid floor ---------- */
  const grid = new THREE.GridHelper(240, 48, COLORS.grid, COLORS.grid);
  grid.position.set(0, -8.5, -20);
  grid.material.transparent = true;
  grid.material.opacity = 0.3;
  scene.add(grid);

  /* ---------- Post-processing (desktop only) ---------- */
  let composer = null;
  let bloomPass = null;
  if (useBloom) {
    composer = new EffectComposer(renderer);
    composer.setPixelRatio(Math.min(pixelRatio, 1.5));
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), BLOOM.strength, BLOOM.radius, BLOOM.threshold);
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
  }

  /* ---------- Layout: fit the loop to the screen ---------- */
  const state = { intro: reduced ? 1 : 0, introScale: reduced ? 1 : 0.72, introSpin: reduced ? 0 : -0.9, hero: 0, page: 0 };
  const layout = { dist: 16, loopY: 1, portrait: false, W: 10, H: 6 };

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    layout.portrait = aspect < 0.85;
    const halfWidth = LOOP.size + (mobile ? 0.9 : 1.4); // loop + labels
    const fill = layout.portrait ? 0.94 : 0.5;          // share of screen width the loop uses
    layout.dist = clamp(halfWidth / (fill * tanHalf * aspect), 11, 42);
    layout.H = layout.dist * tanHalf;
    layout.W = layout.H * aspect;
    // Loop centre sits ~27% from the top (24% on phones), leaving room for the text below.
    layout.loopY = layout.H * (1 - 2 * (layout.portrait ? 0.24 : 0.27));

    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
    labelRenderer.setSize(w, h);
    if (reduced) renderOnce();
  }
  window.addEventListener('resize', resize);

  /* ---------- Pointer parallax (mouse, gyro or touch drag) ---------- */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e) => {
    if (e.pointerType === 'touch') return;
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });
  let touchX = null;
  const onTouchStart = (e) => { touchX = e.touches[0].clientX; };
  const onTouchMove = (e) => {
    if (touchX === null) return;
    const dx = (e.touches[0].clientX - touchX) / window.innerWidth;
    pointer.tx = clamp(pointer.tx + dx * 2, -1, 1);
    touchX = e.touches[0].clientX;
  };
  const onOrient = (e) => {
    if (e.gamma == null) return;
    pointer.tx = clamp(e.gamma / 30, -1, 1);
    pointer.ty = clamp((e.beta - 45) / 30, -1, 1);
  };
  if (mobile) {
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    // Android delivers orientation without a prompt; iOS needs a permission
    // prompt, so there we rely on touch drag instead.
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission !== 'function') {
      window.addEventListener('deviceorientation', onOrient, { passive: true });
    }
  }

  /* ---------- Per-frame placement ---------- */
  const start = new THREE.Vector3(CAMERA.start.x, CAMERA.start.y, CAMERA.start.z);
  const lookTarget = new THREE.Vector3();

  function place(dt) {
    const k = reduced ? 1 : 1 - Math.pow(0.002, dt);
    pointer.x += (pointer.tx - pointer.x) * k;
    pointer.y += (pointer.ty - pointer.y) * k;
    const p = state.hero;
    const ease = p * p * (3 - 2 * p);

    // Camera: fly-in from far away, then parallax and a slow drift with page scroll.
    const endZ = layout.dist + ease * 2;
    const drift = Math.sin(state.page * Math.PI * 2) * 0.8;
    camera.position.set(
      lerp(start.x, CAMERA.end.x, state.intro) + pointer.x * CAMERA.parallax,
      lerp(start.y, CAMERA.end.y, state.intro) - pointer.y * CAMERA.parallax * 0.6 + drift,
      lerp(start.z, endZ, state.intro),
    );
    lookTarget.set(0, drift * 0.5, 0);
    camera.lookAt(lookTarget);

    // Loop: settles above the hero text, then drifts to the right edge and
    // becomes a large, faint backdrop that is partly off-screen.
    const g = loop.group;
    const backX = layout.portrait ? 0 : layout.W * 0.78;
    const backY = layout.portrait ? layout.loopY * 0.4 : -layout.H * 0.05;
    g.position.set(lerp(0, backX, ease), lerp(layout.loopY, backY, ease), lerp(0, -6, ease));
    g.scale.setScalar(state.introScale * lerp(1, layout.portrait ? 0.7 : 0.95, ease));
    g.rotation.set(
      pointer.y * CAMERA.tilt + ease * 0.15,
      pointer.x * CAMERA.tilt + state.introSpin - ease * 0.35 + Math.sin(state.page * Math.PI) * 0.25,
      layout.portrait ? 0 : ease * (0.5 + state.page * 0.6),
    );
    loop.setOpacity(lerp(1, layout.portrait ? 0.18 : 0.26, ease), 1 - clamp(p * 2.2, 0, 1));
    if (bloomPass) bloomPass.strength = lerp(BLOOM.strength, 0.55, ease);
    particles.rotation.y += dt * 0.012;
  }

  /* ---------- Render loop ---------- */
  let raf = 0;
  let running = false;
  let last = 0;
  let acc = 0;
  let frame = 0;

  function draw() {
    if (composer) composer.render(); else renderer.render(scene, camera);
    if (state.hero < 0.999) labelRenderer.render(scene, camera);
  }

  function tick(now) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    acc += dt;
    frame++;
    // Once the loop is only a faded backdrop, draw at half rate to save power.
    if (state.hero >= 0.999 && frame % 2) return;
    const step = Math.min(acc, 0.1);
    acc = 0;
    loop.update(step);
    place(step);
    draw();
  }

  function startLoop() {
    if (running || reduced) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }
  function stopLoop() {
    running = false;
    cancelAnimationFrame(raf);
  }
  function renderOnce() {
    place(1); // set the scroll state first, so labels pick up the right opacity
    loop.update(0);
    draw();
  }

  // Pause completely while the tab is hidden.
  const onVisibility = () => {
    if (document.hidden) stopLoop();
    else if (!reduced) startLoop();
  };
  document.addEventListener('visibilitychange', onVisibility);

  function dispose() {
    stopLoop();
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onPointer);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('deviceorientation', onOrient);
    document.removeEventListener('visibilitychange', onVisibility);
    loop.dispose();
    pGeo.dispose(); pMat.dispose(); dotTex.dispose();
    grid.geometry.dispose(); grid.material.dispose();
    composer?.dispose();
    renderer.dispose();
    labelRenderer.domElement.remove();
  }

  resize();
  return { state, loop, startLoop, stopLoop, renderOnce, dispose, useBloom };
}
