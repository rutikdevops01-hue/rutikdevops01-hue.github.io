/**
 * Central settings for the 3D scene.
 * Change colours, speeds and labels here; nothing else needs editing.
 */

export const COLORS = {
  background: 0x090c11, // page theme colour
  dev: 0x3fd8f5,        // left lobe (Plan, Code, Build, Test): cyan
  ops: 0x3ddc97,        // right lobe (Release, Deploy, Operate, Monitor): green
  packet: 0xf5b544,     // packets travelling the loop: amber
  accent: 0xff5ccb,     // small magenta highlight (node flash core)
  grid: 0x1b2a3a,
  particles: 0x7fb8d8,
};

/**
 * The 8 DevOps stages, in the order a packet visits them.
 * `at` is the position along the loop (0..1, by arc length).
 * The left lobe covers 0.25..0.75 and the right lobe 0.75..1.25 (wrapping).
 */
export const STAGES = [
  { name: 'Plan',      lobe: 'dev', at: 0.3125 },
  { name: 'Design',    lobe: 'dev', at: 0.4375 },
  { name: 'Provision', lobe: 'dev', at: 0.5625 },
  { name: 'Secure',    lobe: 'dev', at: 0.6875 },
  { name: 'Deploy',    lobe: 'ops', at: 0.8125 },
  { name: 'Operate',   lobe: 'ops', at: 0.9375 },
  { name: 'Monitor',   lobe: 'ops', at: 0.0625 },
  { name: 'Optimize',  lobe: 'ops', at: 0.1875 },
];

export const LOOP = {
  size: 4.2,            // half-width of the infinity symbol (scene units)
  depth: 0.9,           // how far the two strands separate where they cross
  tubeRadius: 0.075,
  tubularSegments: 480,
  radialSegments: 14,
  idleSpin: 0.06,       // slow rotation of the whole loop (radians per second)
};

export const PACKETS = {
  count: 5,             // packets on desktop
  countMobile: 3,
  speed: 0.045,         // loop laps per second (0.045 ≈ one lap every 22 s)
  trail: 7,             // glowing dots trailing each packet
  trailGap: 0.006,      // spacing between trail dots (fraction of the loop)
};

export const PARTICLES = { desktop: 1400, mobile: 450 };

export const BLOOM = { strength: 0.85, radius: 0.32, threshold: 0.2 };

/** Intro timeline (seconds). See README "Animation timeline". */
export const INTRO = {
  bootMin: 1.1,         // minimum time the terminal boot screen stays up
  flyIn: 2.8,           // camera push-in duration
  draw: 1.9,            // tube "draws itself" duration
  drawDelay: 0.25,
  nodesAt: 1.1,         // when stage nodes start popping in
  nodeStagger: 0.08,
  textAt: 1.35,         // when the hero text starts fading in
  packetsAt: 2.0,       // when packets start moving
};

export const CAMERA = {
  start: { x: 0, y: 7, z: 62 },
  end: { x: 0, y: 0.6, z: 13.5 },
  parallax: 0.9,        // how far the camera drifts with the pointer
  tilt: 0.16,           // how far the loop tilts with the pointer (radians)
};
