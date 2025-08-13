/* Organic hero background animation for Mental Commons
   Creates 5–10 organic shapes that drift slowly with scale and opacity variations.
   Author: Mental Commons Frontend Team
*/

// Configuration constants
const COLOR = '#2C5F47';              // Dark green from palette
const MIN_OPACITY = 0.05;
const MAX_OPACITY = 0.2;
const MIN_SCALE = 0.8;
const MAX_SCALE = 1.2;
const SPEED = 0.06;                   // Base movement speed (px per frame)

// Utility to generate a random number in range
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function generatePath(radius) {
  // Creates an array of points describing an irregular blob path.
  // Uses randomised radii around a circle to get an organic look.
  const points = 8 + Math.floor(Math.random() * 6); // 8–13 points
  const angleStep = (Math.PI * 2) / points;
  const variance = radius * 0.35; // Up to ±35% variance
  const path = [];

  for (let i = 0; i < points; i++) {
    const angle = i * angleStep;
    const r = radius + rand(-variance, variance);
    path.push({
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
    });
  }
  return path;
}

export function initHeroBackground() {
  const hero = document.getElementById('hero');
  if (!hero) return; // No hero present on this page

  // Respect user motion preference
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Create canvas layer
  const canvas = document.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '1'; // Behind textual content (container has z-index 2)
  hero.prepend(canvas);

  const ctx = canvas.getContext('2d');
  let dpr = window.devicePixelRatio || 1;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = hero.offsetWidth * dpr;
    canvas.height = hero.offsetHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Reset transform taking DPR into account
  }
  resize();
  window.addEventListener('resize', resize);

  // Generate shapes
  const shapeCount = Math.floor(Math.random() * 6) + 5; // 5–10 shapes
  const shapes = Array.from({ length: shapeCount }).map(() => {
    const baseRadius = rand(60, 160);
    return {
      x: rand(0, hero.offsetWidth),
      y: rand(0, hero.offsetHeight),
      vx: rand(-SPEED, SPEED),
      vy: rand(-SPEED, SPEED),
      baseScale: rand(MIN_SCALE, MAX_SCALE),
      scalePhase: rand(0, Math.PI * 2),
      opacity: rand(MIN_OPACITY, MAX_OPACITY),
      path: generatePath(baseRadius),
    };
  });

  function drawShape(s, time) {
    const ctx2 = ctx;
    ctx2.save();
    ctx2.translate(s.x, s.y);

    // Pulsating scale effect
    const scale = s.baseScale + Math.sin(time / 5000 + s.scalePhase) * 0.1;
    ctx2.scale(scale, scale);

    ctx2.beginPath();
    ctx2.moveTo(s.path[0].x, s.path[0].y);
    for (let i = 1; i < s.path.length; i++) {
      ctx2.lineTo(s.path[i].x, s.path[i].y);
    }
    ctx2.closePath();

    ctx2.fillStyle = COLOR;
    ctx2.globalAlpha = s.opacity;
    ctx2.fill();
    ctx2.restore();
  }

  function updatePosition(s) {
    s.x += s.vx;
    s.y += s.vy;

    const w = hero.offsetWidth;
    const h = hero.offsetHeight;
    const buffer = 120; // Allow shapes to float slightly outside before wrapping

    if (s.x < -buffer) s.x = w + buffer;
    if (s.x > w + buffer) s.x = -buffer;
    if (s.y < -buffer) s.y = h + buffer;
    if (s.y > h + buffer) s.y = -buffer;
  }

  function render(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    shapes.forEach((s) => {
      updatePosition(s);
      drawShape(s, time);
    });
  }

  if (reducedMotion) {
    // Only draw a single static frame
    render(0);
  } else {
    const loop = (t) => {
      render(t);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}


