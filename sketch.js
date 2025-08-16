//Prompt: Write a p5js sketch that draws a painting in the abstract and colorfuly stely of wassily kandinsky. Add animation. Give me just the javascript

let seed = 1337;
let circles = [];
let bars = [];
let rays = [];
let orbs = [];
let t = 0;

const PALETTE = ["#f94144","#f3722c","#f8961e","#f9844a","#f9c74f",
                 "#90be6d","#43aa8b","#577590","#3a86ff","#8338ec",
                 "#ff006e","#ffbe0b","#ffd6a5","#caffbf","#bde0fe",
                 "#ffc6ff","#e63946","#00b894","#22223b","#f1faee"];

// Base design reference (used for scaling)
const BASE_W = 900;
const BASE_H = 360;

function targetSize() {
  const wrap = document.querySelector('.wrap') || document.body;
  const w = Math.max(320, Math.round(wrap.clientWidth || window.innerWidth));
  // Pleasant, short banner height; clamps prevent it from feeling huge
  const h = Math.round(constrain(w * 0.28, 180, 300));
  return { w, h };
}

function setup() {
  const { w, h } = targetSize();
  const c = createCanvas(w, h);
  c.parent('sketch-holder');       // attach to the placeholder div in index.html
  pixelDensity(1);
  angleMode(DEGREES);
  noStroke();
  buildComposition();
}

function windowResized() {
  const { w, h } = targetSize();
  resizeCanvas(w, h);
  buildComposition();              // rebuild to fit the new size (no stretching)
}

function buildComposition() {
  randomSeed(seed);
  noiseSeed(seed);

  circles = [];
  bars = [];
  rays = [];
  orbs = [];

  const sx = width / BASE_W;       // scale factors relative to the base design
  const sy = height / BASE_H;
  const s = min(sx, sy);

  // Composition scaffolding
  const cx = width * 0.55 + random(-80, 80) * s;
  const cy = height * 0.5 + random(-60, 60) * s;

  // Concentric circles cluster
  for (let i = 0; i < 10; i++) {
    circles.push({
      x: cx + random(-220, 220) * sx,
      y: cy + random(-180, 180) * sy,
      r: random(40, 180) * s,
      w: random(8, 28) * s,
      hue: random(PALETTE),
      hue2: random(PALETTE),
      rot: random(360),
      drift: random(0.0006, 0.0018)
    });
  }

  // Angular bars/arcs
  for (let i = 0; i < 9; i++) {
    bars.push({
      x: random(width * 0.15, width * 0.85),
      y: random(height * 0.2, height * 0.8),
      w: random(90, 280) * sx,
      h: random(8, 28) * s,
      rot: random(360),
      rotSpd: random(-0.35, 0.35),
      c: random(PALETTE),
      cap: random([0, 1]),
      arc: random() < 0.45,
      arcR: random(50, 160) * s,
      arcSpan: random(40, 220)
    });
  }

  // Radiating lines ("rays")
  const rayCenters = [
    { x: width * 0.25, y: height * 0.25 },
    { x: width * 0.8,  y: height * 0.35 },
    { x: width * 0.4,  y: height * 0.75 }
  ];
  rayCenters.forEach((o, k) => {
    for (let i = 0; i < 22; i++) {
      rays.push({
        ox: o.x, oy: o.y,
        ang: (i * (360 / 22)) + random(-4, 4),
        len: random(80, 260) * s,
        jitter: random(0.6, 1.6) * (k % 2 === 0 ? 1 : -1),
        thick: random(1, 3.5) * s,
        alpha: random(120, 200)
      });
    }
  });

  // Floating orbs (count scales lightly with width)
  const orbCount = floor(map(width, 320, 1200, 8, 16, true));
  for (let i = 0; i < orbCount; i++) {
    orbs.push({
      x: random(-100, width + 100),
      y: random(-100, height + 100),
      r: random(14, 34) * s,
      c: random(PALETTE),
      z: random(0.4, 1.2),
      phase: random(1000)
    });
  }
}

function draw() {
  t = millis() * 0.001;

  backgroundGradient();
  paperTexture();

  push(); blendMode(MULTIPLY); drawOrbs(); pop();

  drawRays();
  drawCircles();
  drawBars();
  drawAccents();
  vignette();
}

function backgroundGradient() {
  // Soft vertical gradient
  const hueShift = (sin(t * 6) * 0.5 + 0.5) * 8;
  for (let y = 0; y < height; y += 2) {
    const n = y / height;
    const c1 = color(250, 245, 240);
    const c2 = color(235 - hueShift, 240 - hueShift * 0.7, 252);
    const c = lerpColor(c1, c2, n);
    stroke(c);
    line(0, y, width, y);
  }
}

function paperTexture() {
  // Subtle grain scaled to area for performance
  loadPixels();
  const grains = min(2000, floor(width * height * 0.0025));
  for (let i = 0; i < grains; i++) {
    const x = (Math.random() * width) | 0;
    const y = (Math.random() * height) | 0;
    const idx = 4 * (y * width + x);
    const g = 252 + Math.random() * 12 - 6;
    pixels[idx]   = (pixels[idx]   + g) * 0.5;
    pixels[idx+1] = (pixels[idx+1] + g) * 0.5;
    pixels[idx+2] = (pixels[idx+2] + g) * 0.5;
  }
  updatePixels();
}

function drawOrbs() {
  noStroke();
  for (const o of orbs) {
    const dx = (noise(o.phase + t * 0.08) - 0.5) * 36 * o.z;
    const dy = (noise(o.phase + 99 + t * 0.08) - 0.5) * 36 * o.z;
    fill(colorAlpha(o.c, 60));
    circle(o.x + dx, o.y + dy, o.r * 2);
    fill(colorAlpha(o.c, 25));
    circle(o.x + dx * 1.3, o.y + dy * 1.3, o.r * 3.0);
  }
}

function drawRays() {
  push();
  for (const r of rays) {
    const a = r.ang + sin(t * 18 * r.jitter) * 2;
    const ex = r.ox + cos(a) * (r.len + sin(t * 28 + r.len) * 8);
    const ey = r.oy + sin(a) * (r.len + cos(t * 24 + r.len) * 8);
    strokeWeight(r.thick);
    stroke(0, r.alpha);
    line(r.ox, r.oy, ex, ey);
  }
  pop();
}

function drawCircles() {
  for (const c of circles) {
    push();
    translate(c.x, c.y);
    rotate(c.rot + sin(t * 40 * c.drift) * 4);

    // outer glow
    noFill();
    stroke(colorAlpha(c.hue, 70));
    strokeWeight(c.w * 0.35);
    circle(0, 0, c.r * 2.1 + sin(t * 70 + c.r) * 5);

    // main ring
    stroke(colorAlpha(c.hue2, 200));
    strokeWeight(c.w);
    circle(0, 0, c.r * 2);

    // inner fill
    noStroke();
    fill(colorAlpha(c.hue, 170));
    circle(0, 0, c.r * 0.65 + sin(t * 55 + c.r) * 5);

    // small off-center dot
    fill(0, 160);
    circle(c.r * 0.2, -c.r * 0.2, max(3, c.w * 0.4));
    pop();
  }
}

function drawBars() {
  for (const b of bars) {
    push();
    translate(b.x, b.y);
    rotate(b.rot);
    b.rot += b.rotSpd;

    // shadow
    noStroke();
    fill(0, 18);
    rect(4, 4, b.w, b.h, b.cap ? 0 : 8);

    // colored bar
    fill(b.c);
    rect(0, 0, b.w, b.h, b.cap ? 0 : 8);

    // overlay stroke
    noFill();
    stroke(0, 160);
    strokeWeight(1.2);
    rect(0, 0, b.w, b.h, b.cap ? 0 : 8);

    // optional arc accent
    if (b.arc) {
      const aStart = (frameCount * 0.6 + b.w) % 360;
      const aEnd = aStart + b.arcSpan + sin(t * 110 + b.h) * 8;
      stroke(0, 200);
      strokeWeight(2);
      noFill();
      arc(0, 0, b.arcR * 2, b.arcR * 2, aStart, aEnd);
      stroke(255, 170);
      strokeWeight(5);
      arc(0, 0, b.arcR * 2, b.arcR * 2, aStart + 2, aStart + 8);
    }
    pop();
  }
}

function drawAccents() {
  push();
  stroke(0);

  // triangle cluster
  const tx = width * 0.18 + sin(t * 38) * 6;
  const ty = height * 0.62 + cos(t * 33) * 6;
  strokeWeight(2);
  fill(255, 230);
  triangle(tx - 26, ty + 34, tx + 34, ty, tx + 8, ty + 68);
  noFill();
  strokeWeight(3);
  arc(tx + 8, ty + 30, 100, 100, 220, 350);

  // thin cross
  stroke(0, 200);
  strokeWeight(1.3);
  const cx = width * 0.72 + sin(t * 22) * 10;
  const cy = height * 0.22 + cos(t * 18) * 10;
  line(cx - 48, cy, cx + 48, cy);
  line(cx, cy - 48, cx, cy + 48);

  // dotted rhythm line
  const y = height * 0.88;
  noStroke();
  for (let x = width * 0.1; x < width * 0.9; x += 16) {
    const rr = 2 + (sin(t * 160 + x * 0.2) * 1.1 + 1.1);
    fill(0, 170);
    circle(x, y + sin(x * 0.08 + t * 44) * 2.5, rr * 2);
  }
  pop();
}

function vignette() {
  push();
  noFill();
  rectMode(CENTER);
  for (let i = 0; i < 40; i++) {
    stroke(0, map(i, 0, 39, 2, 30));
    rect(width / 2, height / 2, width + i * 6, height + i * 6);
  }
  rectMode(CORNER);
  pop();
}

function colorAlpha(hex, a) {
  const c = color(hex);
  return color(red(c), green(c), blue(c), a);
}

