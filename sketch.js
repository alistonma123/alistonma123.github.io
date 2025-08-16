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

function calcSize() {
  // Prefer #sketch-holder width; fall back to .wrap or body
  const holder = document.getElementById('sketch-holder') ||
                 document.querySelector('.wrap') ||
                 document.body;
  const w = Math.max(300, Math.round(holder.clientWidth || window.innerWidth));
  // Responsive height: ~45% of width, clamped for comfort
  const h = Math.round(constrain(w * 0.45, 220, 520));
  return { w, h };
}

function setup() {
  const { w, h } = calcSize();
  const c = createCanvas(w, h);
  c.parent('sketch-holder');
  pixelDensity(1);        // keeps perf reasonable on HiDPI
  angleMode(DEGREES);
  noStroke();
  buildComposition();
}

function windowResized() {
  const { w, h } = calcSize();
  resizeCanvas(w, h);
  buildComposition();     // rebuild layout to the new size
}

function buildComposition() {
  randomSeed(seed);
  noiseSeed(seed);

  circles = [];
  bars = [];
  rays = [];
  orbs = [];

  // Composition scaffolding based on current canvas size
  const cx = width * 0.55 + random(-80, 80);
  const cy = height * 0.5 + random(-60, 60);

  // Concentric circles cluster
  for (let i = 0; i < 10; i++) {
    circles.push({
      x: cx + random(-220, 220) * (width / 900),
      y: cy + random(-180, 180) * (height / 400),
      r: random(40, 180) * (min(width / 900, height / 400)),
      w: random(8, 28),
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
      w: random(90, 280) * (width / 900),
      h: random(8, 28),
      rot: random(360),
      rotSpd: random(-0.35, 0.35),
      c: random(PALETTE),
      cap: random([0, 1]),
      arc: random() < 0.45,
      arcR: random(50, 160) * (min(width / 900, height / 400)),
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
        len: random(80, 260) * (min(width / 900, height / 400)),
        jitter: random(0.6, 1.6) * (k % 2 === 0 ? 1 : -1),
        thick: random(1, 3.5),
        alpha: random(120, 200)
      });
    }
  });

  // Floating orbs (count scaled lightly by width)
  const orbCount = floor(map(width, 320, 1200, 8, 18, true));
  for (let i = 0; i < orbCount; i++) {
    orbs.push({
      x: random(-100, width + 100),
      y: random(-100, height + 100),
      r: random(16, 46),
      c: random(PALETTE),
      z: random(0.4, 1.4),
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
  // Soft vertical gradient with a slow hue shift
  let s = (sin(t * 8) * 0.5 + 0.5) * 10;
  for (let y = 0; y < height; y += 2) {
    let n = map(y, 0, height, 0, 1);
    let c1 = color(250, 245, 240);
    let c2 = color(235 - s, 240 - s * 0.7, 252);
    let c = lerpColor(c1, c2, n);
    stroke(c);
    line(0, y, width, y);
  }
}

function paperTexture() {
  // Subtle paper grain — scale work to canvas area for perf
  loadPixels();
  const grains = min(3000, floor(width * height * 0.003));
  for (let i = 0; i < grains; i++) {
    let x = (Math.random() * width) | 0;
    let y = (Math.random() * height) | 0;
    let idx = 4 * (y * width + x);
    let g = 252 + Math.random() * 12 - 6;
    pixels[idx]   = (pixels[idx]   + g) * 0.5;
    pixels[idx+1] = (pixels[idx+1] + g) * 0.5;
    pixels[idx+2] = (pixels[idx+2] + g) * 0.5;
  }
  updatePixels();
}

function drawOrbs() {
  noStroke();
  for (let o of orbs) {
    let dx = (noise(o.phase + t * 0.08) - 0.5) * 40 * o.z;
    let dy = (noise(o.phase + 99 + t * 0.08) - 0.5) * 40 * o.z;
    fill(colorAlpha(o.c, 60));
    circle(o.x + dx, o.y + dy, o.r * 2);
    fill(colorAlpha(o.c, 25));
    circle(o.x + dx * 1.3, o.y + dy * 1.3, o.r * 3.2);
  }
}

function drawRays() {
  push();
  for (let r of rays) {
    let a = r.ang + sin(t * 20 * r.jitter) * 2;
    let ex = r.ox + cos(a) * (r.len + sin(t * 30 + r.len) * 10);
    let ey = r.oy + sin(a) * (r.len + cos(t * 27 + r.len) * 10);
    strokeWeight(r.thick);
    stroke(0, r.alpha);
    line(r.ox, r.oy, ex, ey);
  }
  pop();
}

function drawCircles() {
  for (let c of circles) {
    push();
    translate(c.x, c.y);
    rotate(c.rot + sin(t * 50 * c.drift) * 4);

    // outer glow
    noFill();
    stroke(colorAlpha(c.hue, 70));
    strokeWeight(c.w * 0.35);
    circle(0, 0, c.r * 2.2 + sin(t * 80 + c.r) * 6);

    // main ring
    stroke(colorAlpha(c.hue2, 200));
    strokeWeight(c.w);
    circle(0, 0, c.r * 2);

    // inner fill
    noStroke();
    fill(colorAlpha(c.hue, 170));
    circle(0, 0, c.r * 0.7 + sin(t * 60 + c.r) * 6);

    // small off-center dot
    fill(0, 180);
    circle(c.r * 0.2, -c.r * 0.2, max(4, c.w * 0.4));
    pop();
  }
}

function drawBars() {
  for (let b of bars) {
    push();
    translate(b.x, b.y);
    rotate(b.rot);
    b.rot += b.rotSpd;

    // shadow
    noStroke();
    fill(0, 18);
    rect(6, 6, b.w, b.h, b.cap ? 0 : 8);

    // colored bar
    fill(b.c);
    rect(0, 0, b.w, b.h, b.cap ? 0 : 8);

    // overlay stroke
    noFill();
    stroke(0, 180);
    strokeWeight(1.2);
    rect(0, 0, b.w, b.h, b.cap ? 0 : 8);

    // optional arc accent
    if (b.arc) {
      let aStart = (frameCount * 0.6 + b.w) % 360;
      let aEnd = aStart + b.arcSpan + sin(t * 120 + b.h) * 10;
      stroke(0, 200);
      strokeWeight(2);
      noFill();
      arc(0, 0, b.arcR * 2, b.arcR * 2, aStart, aEnd);
      stroke(255, 180);
      strokeWeight(6);
      arc(0, 0, b.arcR * 2, b.arcR * 2, aStart + 2, aStart + 8);
    }
    pop();
  }
}

function drawAccents() {
  push();
  // triangle cluster
  let tx = width * 0.18 + sin(t * 40) * 8;
  let ty = height * 0.6 + cos(t * 35) * 8;
  stroke(0); strokeWeight(2);
  fill(255, 230);
  triangle(tx - 30, ty + 40, tx + 40, ty, tx + 10, ty + 80);
  noFill();
  strokeWeight(3);
  arc(tx + 10, ty + 35, 120, 120, 220, 350);

  // thin cross
  stroke(0, 200);
  strokeWeight(1.5);
  let cx = width * 0.7 + sin(t * 25) * 12;
  let cy = height * 0.22 + cos(t * 20) * 12;
  line(cx - 60, cy, cx + 60, cy);
  line(cx, cy - 60, cx, cy + 60);

  // dotted rhythm line
  let y = height * 0.88;
  noStroke();
  for (let x = width * 0.1; x < width * 0.9; x += 18) {
    let rr = 2 + (sin(t * 180 + x * 0.2) * 1.3 + 1.3);
    fill(0, 180);
    circle(x, y + sin(x * 0.08 + t * 50) * 3, rr * 2);
  }
  pop();
}

function vignette() {
  push();
  noFill();
  rectMode(CENTER);
  for (let i = 0; i < 50; i++) {
    stroke(0, map(i, 0, 49, 2, 40));
    rect(width / 2, height / 2, width + i * 8, height + i * 8);
  }
  rectMode(CORNER);
  pop();
}

function colorAlpha(hex, a) {
  let c = color(hex);
  return color(red(c), green(c), blue(c), a);
}

