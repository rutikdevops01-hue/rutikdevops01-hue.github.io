/**
 * The CI/CD infinity loop.
 *
 * - A lemniscate (figure-8) curve, given a little depth so the two strands
 *   pass in front of / behind each other where they cross.
 * - A glowing tube along it: cyan on the DEV lobe, green on the OPS lobe.
 * - 8 stage nodes (one InstancedMesh) with pulse rings and HTML labels.
 * - Packets with short trails (two InstancedMeshes) that travel the loop.
 *   When a packet passes a node, the node pulses and its label lights up.
 *
 * Everything is generated in code: no models or image files.
 */
import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { COLORS, STAGES, LOOP, PACKETS } from '../config.js';

/** Lemniscate of Bernoulli with depth. getPoint(t) uses the raw angle;
 *  three.js converts to arc length for getPointAt(u), so u=0.25 and
 *  u=0.75 are exactly the two crossing points. */
class LemniscateCurve extends THREE.Curve {
  constructor(size, depth) {
    super();
    this.size = size;
    this.depth = depth;
    this.arcLengthDivisions = 1200; // accurate arc-length mapping
  }
  getPoint(t, target = new THREE.Vector3()) {
    const a = t * Math.PI * 2;
    const s = Math.sin(a);
    const c = Math.cos(a);
    const d = 1 + s * s;
    return target.set((this.size * c) / d, (this.size * s * c) / d, 0.5 * this.depth * s);
  }
}

const smooth = (e0, e1, x) => {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
};
/** 1 on the DEV lobe (0.25..0.75), 0 on the OPS lobe, blended at the crossings. */
const devAmount = (u) => smooth(0.2, 0.3, u) * (1 - smooth(0.7, 0.8, u));

/** Small soft dot texture drawn on a canvas (used for glow sprites). */
function makeDotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.3, 'rgba(255,255,255,0.5)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createInfinityLoop({ mobile = false, reduced = false, bloom = true } = {}) {
  const group = new THREE.Group();   // moved / scaled by intro + scroll
  const tiltGroup = new THREE.Group(); // tilted by the pointer
  group.add(tiltGroup);

  const curve = new LemniscateCurve(LOOP.size, LOOP.depth);
  const devColor = new THREE.Color(COLORS.dev);
  const opsColor = new THREE.Color(COLORS.ops);
  const tmpColor = new THREE.Color();
  const disposables = [];

  /* ---------- Tube ---------- */
  const segs = mobile ? Math.round(LOOP.tubularSegments * 0.6) : LOOP.tubularSegments;
  const radial = mobile ? 10 : LOOP.radialSegments;
  const tubeGeo = new THREE.TubeGeometry(curve, segs, LOOP.tubeRadius, radial, true);
  // Colour each ring of vertices by where it sits on the loop.
  const colors = new Float32Array(tubeGeo.attributes.position.count * 3);
  for (let i = 0; i <= segs; i++) {
    tmpColor.copy(opsColor).lerp(devColor, devAmount(i / segs));
    for (let j = 0; j <= radial; j++) {
      const k = (i * (radial + 1) + j) * 3;
      colors[k] = tmpColor.r; colors[k + 1] = tmpColor.g; colors[k + 2] = tmpColor.b;
    }
  }
  tubeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const tubeMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, transparent: true });
  const tube = new THREE.Mesh(tubeGeo, tubeMat);
  tiltGroup.add(tube);
  disposables.push(tubeGeo, tubeMat);

  // Soft outer sheath: gives a glow even where bloom is off (mobile).
  const sheathGeo = new THREE.TubeGeometry(curve, Math.round(segs / 2), LOOP.tubeRadius * 3.2, 8, true);
  sheathGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(sheathGeo.attributes.position.count * 3), 3));
  {
    const sc = sheathGeo.attributes.color.array;
    const sr = 8;
    const ss = Math.round(segs / 2);
    for (let i = 0; i <= ss; i++) {
      tmpColor.copy(opsColor).lerp(devColor, devAmount(i / ss));
      for (let j = 0; j <= sr; j++) {
        const k = (i * (sr + 1) + j) * 3;
        sc[k] = tmpColor.r; sc[k + 1] = tmpColor.g; sc[k + 2] = tmpColor.b;
      }
    }
  }
  const sheathMat = new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, opacity: bloom ? 0.07 : 0.16,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const sheath = new THREE.Mesh(sheathGeo, sheathMat);
  tiltGroup.add(sheath);
  disposables.push(sheathGeo, sheathMat);

  const tubeIndexCount = tubeGeo.index.count;
  const sheathIndexCount = sheathGeo.index.count;
  /** Reveal the tube along its length (0..1); used by the intro. */
  function setDraw(p) {
    const step = radial * 6;
    tubeGeo.setDrawRange(0, Math.floor((tubeIndexCount / step) * p) * step);
    sheathGeo.setDrawRange(0, Math.floor((sheathIndexCount / 48) * p) * 48);
  }

  /* ---------- Stage nodes ---------- */
  const nodeGeo = new THREE.SphereGeometry(0.17, mobile ? 16 : 24, mobile ? 12 : 16);
  const nodeMat = new THREE.MeshBasicMaterial({ toneMapped: false });
  const nodes = new THREE.InstancedMesh(nodeGeo, nodeMat, STAGES.length);
  const ringGeo = new THREE.RingGeometry(0.27, 0.31, 48);
  const ringMat = new THREE.MeshBasicMaterial({
    toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const rings = new THREE.InstancedMesh(ringGeo, ringMat, STAGES.length);
  tiltGroup.add(nodes, rings);
  disposables.push(nodeGeo, nodeMat, ringGeo, ringMat);

  const white = new THREE.Color(0xffffff);
  const accent = new THREE.Color(COLORS.accent);
  const dummy = new THREE.Object3D();
  const labelsRoot = new THREE.Group();
  tiltGroup.add(labelsRoot);

  const stageState = STAGES.map((stage, i) => {
    const pos = curve.getPointAt(stage.at);
    const base = stage.lobe === 'dev' ? devColor.clone() : opsColor.clone();
    // Label sits above nodes on the top half and below nodes on the bottom
    // half, nudged outwards, so labels near the crossing never collide.
    const dir = new THREE.Vector3(Math.sign(pos.x) * 0.35, Math.sign(pos.y), 0);
    const el = document.createElement('div');
    el.className = `stage-label ${stage.lobe}`;
    el.innerHTML = `<span class="idx">${String(i + 1).padStart(2, '0')}</span>${stage.name}`;
    const label = new CSS2DObject(el);
    label.position.copy(pos).addScaledVector(dir, mobile ? 0.5 : 0.52);
    labelsRoot.add(label);
    return { ...stage, pos, base, el, label, appear: reduced ? 1 : 0, pulse: 0, hitTimer: 0, lastOpacity: -1 };
  });

  /* ---------- Packets + trails ---------- */
  const packetCount = mobile ? PACKETS.countMobile : PACKETS.count;
  const packetGeo = new THREE.OctahedronGeometry(0.11, 0);
  const packetMat = new THREE.MeshBasicMaterial({ color: COLORS.packet, toneMapped: false });
  const packets = new THREE.InstancedMesh(packetGeo, packetMat, packetCount);
  const trailCount = packetCount * PACKETS.trail;
  const trailGeo = new THREE.SphereGeometry(0.05, 8, 6);
  const trailMat = new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const trails = new THREE.InstancedMesh(trailGeo, trailMat, trailCount);
  const packetColor = new THREE.Color(COLORS.packet);
  for (let i = 0; i < trailCount; i++) {
    const k = i % PACKETS.trail;
    trails.setColorAt(i, tmpColor.copy(packetColor).multiplyScalar(0.9 * (1 - k / PACKETS.trail)));
  }
  trails.instanceColor.needsUpdate = true;
  packets.visible = trails.visible = false;
  tiltGroup.add(packets, trails);
  disposables.push(packetGeo, packetMat, trailGeo, trailMat);

  const packetState = Array.from({ length: packetCount }, (_, k) => ({ u: k / packetCount, prev: k / packetCount }));
  let packetsRunning = false;
  let flow = 0; // 0..1, eases packets in when they start

  const pt = new THREE.Vector3();
  /** Did a packet moving from `a` to `b` (wrapping at 1) pass position `x`? */
  const crossed = (a, b, x) => (a <= b ? x > a && x <= b : x > a || x <= b);

  function placePackets(dtLap) {
    for (let k = 0; k < packetCount; k++) {
      const p = packetState[k];
      p.prev = p.u;
      p.u = (p.u + dtLap) % 1;
      if (dtLap > 0) {
        for (const s of stageState) {
          if (crossed(p.prev, p.u, s.at)) {
            s.pulse = 1;
            s.hitTimer = 0.7;
            s.el.classList.add('hit');
          }
        }
      }
      curve.getPointAt(p.u, pt);
      dummy.position.copy(pt);
      dummy.rotation.set(p.u * 40, p.u * 30, 0);
      dummy.scale.setScalar(flow);
      dummy.updateMatrix();
      packets.setMatrixAt(k, dummy.matrix);
      for (let j = 0; j < PACKETS.trail; j++) {
        const u = (p.u - (j + 1) * PACKETS.trailGap + 1) % 1;
        curve.getPointAt(u, pt);
        dummy.position.copy(pt);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(flow * (1 - j / PACKETS.trail) * 1.1);
        dummy.updateMatrix();
        trails.setMatrixAt(k * PACKETS.trail + j, dummy.matrix);
      }
    }
    packets.instanceMatrix.needsUpdate = true;
    trails.instanceMatrix.needsUpdate = true;
  }

  let labelOpacity = 1;
  function updateNodes(dt) {
    stageState.forEach((s, i) => {
      s.pulse = Math.max(0, s.pulse - dt * 1.7);
      if (s.hitTimer > 0) {
        s.hitTimer -= dt;
        if (s.hitTimer <= 0) s.el.classList.remove('hit');
      }
      const appear = s.appear;
      // Core: grows slightly and flashes towards white/magenta on a hit.
      dummy.position.copy(s.pos);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(appear * (1 + s.pulse * 0.7));
      dummy.updateMatrix();
      nodes.setMatrixAt(i, dummy.matrix);
      tmpColor.copy(s.base).lerp(s.pulse > 0.5 ? accent : white, s.pulse * 0.75).multiplyScalar(1 + s.pulse * 0.6);
      nodes.setColorAt(i, tmpColor);
      // Ring: a quiet halo at rest; after a hit it becomes a shockwave
      // that expands and fades out.
      const hit = s.pulse > 0;
      dummy.scale.setScalar(appear * (hit ? 1 + (1 - s.pulse) * 1.6 : 1));
      dummy.updateMatrix();
      rings.setMatrixAt(i, dummy.matrix);
      rings.setColorAt(i, tmpColor.copy(s.base).multiplyScalar(appear * (hit ? s.pulse * 1.3 : 0.24)));
      // Label fades with its node and with the scroll hand-off.
      const o = Math.round(appear * labelOpacity * 100) / 100;
      if (o !== s.lastOpacity) {
        s.el.style.opacity = o;
        s.el.style.visibility = o < 0.02 ? 'hidden' : 'visible';
        s.lastOpacity = o;
      }
    });
    nodes.instanceMatrix.needsUpdate = true;
    rings.instanceMatrix.needsUpdate = true;
    nodes.instanceColor.needsUpdate = true;
    rings.instanceColor.needsUpdate = true;
  }

  let spin = 0;
  function update(dt) {
    if (!reduced) spin += dt * LOOP.idleSpin;
    // Gentle "breathing" rotation so the 3D depth of the crossing reads.
    tiltGroup.rotation.y = Math.sin(spin) * 0.35;
    tiltGroup.rotation.x = Math.sin(spin * 0.7) * 0.06;
    if (packetsRunning) {
      flow = Math.min(1, flow + dt * 1.5);
      placePackets(reduced ? 0 : dt * PACKETS.speed);
    }
    updateNodes(dt);
  }

  function startPackets() {
    packetsRunning = true;
    packets.visible = trails.visible = true;
    if (reduced) { flow = 1; placePackets(0); }
  }

  /** Fade the whole loop (scroll hand-off). */
  function setOpacity(o, labels = o) {
    tubeMat.opacity = o;
    sheathMat.opacity = (bloom ? 0.07 : 0.16) * o;
    nodeMat.opacity = o;
    nodeMat.transparent = o < 1;
    packetMat.opacity = o;
    packetMat.transparent = o < 1;
    trailMat.opacity = o;
    ringMat.opacity = o;
    labelOpacity = labels;
  }

  function dispose() {
    disposables.forEach((d) => d.dispose());
    nodes.dispose();
    rings.dispose();
    packets.dispose();
    trails.dispose();
    stageState.forEach((s) => s.el.remove());
  }

  // Initial state
  setDraw(reduced ? 1 : 0);
  updateNodes(0);

  return { group, tiltGroup, curve, stages: stageState, setDraw, startPackets, update, setOpacity, dispose };
}
