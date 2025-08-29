/**
 * Title: "Turquoise and Tobacco"
 * Author: Aliston Ma
 * Story:
 *  - Scene opens with the character asleep in bed (dim room, soft Z's).
 *  - Click the character in bed to wake him up.
 *  - After waking, your original interactive scene resumes (camera, moods, smoke, etc.).
 *  - NEW: Scroll to inhale/exhale — deepens night, thickens smoke, reveals whispers.
 */

 let gameState = "sleep";
 let wakeFade = 0;
 
 let afterImage = null;
 let afterAlpha = 0;
 let flashAlpha = 0;
 
 let mood = "calm";
 
 let cig;
 let cigSmoke = [];
 let cigEmitTimer = 0;
 
 let palettes = {
   calm:    { sun: "#FFF5BA" },
   furious: { sun: "#FFD700" }
 };
 
 let stepPhase = 0;
 let lastMouseX = 0;
 let personPos = { x: 0, y: 0 };
 let personHand = { x: 0, y: 0 };
 
 let camObj = {
   x: 0, y: 0, w: 34, h: 20,
   held: false,
   homeX: 0, homeY: 0
 };
 
 let cigObj = { held: false };
 
 let bedRect = { x: 0, y: 0, w: 0, h: 0, pillow: {x:0,y:0,w:0,h:0} };
 
 /* -------- NEW: Breath (0..1) via scroll → atmosphere & smoke -------- */
 let breath = 0.0; // 0 = clear dusk, 1 = heavy exhale/night
 const whispersText = [
   "the room remembers",
   "click, flash, forget",
   "turquoise promises",
   "bitter tobacco",
   "I was here before",
   "hold your breath"
 ];
 let whispers = [];
 function setup() {
  let c = createCanvas(windowWidth, windowHeight);
  c.parent("sketch-holder");   // attach canvas to the container in tobacco.html
  noStroke();
  layoutScene();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  layoutScene();
}

function layoutScene() {
  cig = {
    x: width * 0.66,
    y: height * 0.74 - 6,
    angle: -PI / 28,
    len: 78,
    thick: 10,
    emberX: 0,
    emberY: 0,
    homeX: width * 0.66,
    homeY: height * 0.74 - 6
  };

  const deskX = width * 0.6;
  const deskY = height * 0.74;
  camObj.homeX = deskX + 28;
  camObj.homeY = deskY - 8;
  if (!camObj.held) {
    camObj.x = camObj.homeX;
    camObj.y = camObj.homeY;
  }

  // Bed smaller: ~30% width, ~10% height of canvas
  bedRect.w = width * 0.30;
  bedRect.h = height * 0.10;
  bedRect.x = width * 0.12;
  bedRect.y = height * 0.68;

  bedRect.pillow = {
    x: bedRect.x + bedRect.w * 0.08,
    y: bedRect.y - bedRect.h * 0.35,
    w: bedRect.w * 0.35,
    h: bedRect.h * 0.35
  };
}

 function draw() {
   if (gameState === "sleep") {
     drawSleepScene();
     drawBottomBar(["Click the sleeping figure to wake up"]);
     return;
   }
 
   drawSunsetGradientAndSun();
   const win = drawRoom();
 
   drawPerson();
   drawCamera();
 
   const cup = { x: width * 0.75, y: height * 0.85, r: 42 };
   drawMatcha(cup);
 
   if (cigObj.held) {
     drawCigarette({
       x: personHand.x,
       y: personHand.y,
       angle: -PI / 10,
       len: cig.len,
       thick: cig.thick,
       emberX: 0,
       emberY: 0
     });
   } else {
     drawCigarette(cig);
   }
 
   emitCigSmoke();
   updateDrawCigSmoke();
 
   // NEW: breath-driven whispers
   drawWhispers();
 
   // Vignette darkens with breath
   drawVignette(breath);
 
   drawGrain(220, 18);
 
   if (afterImage && afterAlpha > 0) {
     push();
     tint(255, afterAlpha);
     image(afterImage, 0, 0);
     pop();
     afterAlpha -= 1.5;
   }
   if (flashAlpha > 0) {
     fill(255, flashAlpha);
     rect(0, 0, width, height);
     flashAlpha -= 15;
   }
 
   const lines = [];
   lines.push(`Mood: ${mood}  (press C for Calm, F for Furious)`);
   lines.push(`Breath (scroll): ${nf(breath, 1, 2)}  — inhale↑ / exhale↓`);
   if (isHoldingAnything()) {
     lines.push(`Hold: ${camObj.held ? "Camera" : "Cigarette"}  •  Press D to drop`);
     if (camObj.held) lines.push(`Action: Click to snap a photo`);
   } else {
     lines.push(`Pickups: Camera — move close and click; Cigarette — click near the tip`);
   }
   drawBottomBar(lines);
 
   const dx = mouseX - lastMouseX;
   stepPhase += constrain(abs(dx) * 0.02, 0, 0.3);
   lastMouseX = mouseX;
 
   if (wakeFade > 0) {
     fill(0, wakeFade);
     rect(0, 0, width, height);
     wakeFade -= 6;
   }
 }
 
 /* ---------------- Sleep Scene ---------------- */
 function drawSleepScene() {
   drawSleepGradientAndMoon();
   drawRoomSleeping();
   drawSleepingPerson();
   drawGrain(160, 14);
 }
 
 function drawSleepGradientAndMoon() {
   const cTop = color(10, 20, 35);
   const cBottom = color(30, 35, 60);
   for (let y = 0; y < height; y++) {
     const inter = y / height;
     const c = lerpColor(cTop, cBottom, inter);
     stroke(c);
     line(0, y, width, y);
   }
   const moonX = width * 0.72;
   const moonY = height * 0.22;
   fill(240, 240, 255, 180);
   circle(moonX, moonY, 80);
 }
 
 function drawRoomSleeping() {
   noStroke();
   fill(0, 35);
   rect(0, height * 0.78, width, height * 0.22);
 
   fill(40, 120, 120, 140);
   rect(bedRect.x, bedRect.y, bedRect.w, bedRect.h, 14);
 
   fill(210, 160, 170, 180);
   rect(bedRect.pillow.x, bedRect.pillow.y, bedRect.pillow.w, bedRect.pillow.h, 10);
 
   fill(40, 40, 50, 160);
   rect(width * 0.6, height * 0.74, width * 0.25, height * 0.05, 8);
 
   const win = { x: width * 0.55, y: height * 0.18, w: width * 0.35, h: height * 0.3 };
   fill(220, 230, 255, 40);
   rect(win.x, win.y, win.w, win.h, 10);
 
   push();
   drawingContext.save();
   drawingContext.beginPath();
   drawingContext.roundRect(win.x, win.y, win.w, win.h, 10);
   drawingContext.clip();
   noStroke();
   fill(255, 255, 255, 18);
   let rx = win.x + win.w * 0.1;
   for (let i = 0; i < 3; i++) {
     quad(rx + i * 18, win.y + 8,
          rx + i * 18 + 6, win.y + 18,
          rx + i * 18 + win.w * 0.2, win.y + win.h - 12,
          rx + i * 18 + win.w * 0.2 + 6, win.y + win.h - 2);
   }
   drawingContext.restore();
   pop();
 
   drawTriangularCurtains(win);
 }
 
 function drawSleepingPerson() {
   const px = bedRect.x + bedRect.w * 0.28;
   const py = bedRect.y + bedRect.h * 0.48;
   const breathe = sin(frameCount * 0.03) * 2;
 
   noStroke();
   fill(0, 40);
   ellipse(px + 20, py + 34, 36, 10);
 
   const skin = color(245, 220, 200);
   const shirt = color(70, 120, 160);
 
   fill(shirt);
   rect(px - 12, py - 6 + breathe, 24, 20, 6);
 
   fill(skin);
   ellipse(px - 22, py - 16, 18, 20);
 
   fill(30, 30, 40, 220);
   rect(px - 8, py - 10 + breathe, 6, 16, 3);
   rect(px + 2, py - 10 + breathe, 6, 16, 3);
 
   fill(30);
   rect(px - 26, py - 16, 8, 2, 1);
 
   const zBaseX = px - 38;
   const zBaseY = py - 38;
   drawZ(zBaseX, zBaseY, 10, 150);
   drawZ(zBaseX - 14, zBaseY - 16, 14, 120);
   drawZ(zBaseX - 28, zBaseY - 32, 18, 90);
 }
 
 function drawZ(x, y, s, a) {
   push();
   translate(x, y + sin(frameCount * 0.02 + x * 0.1) * 2);
   fill(255, a);
   noStroke();
   textAlign(CENTER, CENTER);
   textSize(s);
   text("Z", 0, 0);
   pop();
 }
 
 function isClickOnSleeper(mx, my) {
   const px = bedRect.x + bedRect.w * 0.28;
   const py = bedRect.y + bedRect.h * 0.48;
   const hx = px - 22;
   const hy = py - 16;
   return dist(mx, my, hx, hy) < 28 ||
          (mx > bedRect.x && mx < bedRect.x + bedRect.w &&
           my > bedRect.y && my < bedRect.y + bedRect.h);
 }
 
 function mousePressed() {
   if (gameState === "sleep") {
     if (isClickOnSleeper(mouseX, mouseY)) {
       gameState = "awake";
       wakeFade = 180;
     }
     return;
   }
 
   // If holding camera, clicking snaps a photo
   if (camObj.held) {
     flashAlpha = 255;
     afterImage = get();
     afterAlpha = 140;
     return;
   }
 
   // If holding cigarette, clicking does nothing special
   if (cigObj.held) return;
 
   // Pickup logic: only when nothing is held
   if (!isHoldingAnything()) {
     // Try cigarette first (click near tip)
     if (dist(mouseX, mouseY, cig.x, cig.y) < 40) {
       pickUp("cig");
       return;
     }
     // Then camera (must be near)
     if (overCamera(mouseX, mouseY) && isNearCamera()) {
       pickUp("cam");
       return;
     }
   }
 }
 
 function keyPressed() {
   if (gameState === "sleep") return;
 
   if (key === 'F' || key === 'f') mood = "furious";
   if (key === 'C' || key === 'c') mood = "calm";
 
   // Unified drop: D drops whatever is held
   if (key === 'D' || key === 'd') {
     dropHeld();
   }
 }
 
 /* -------- NEW: Scroll to control breath (inhale/exhale) -------- */
 function mouseWheel(event) {
   // event.deltaY > 0 => scroll down (exhale), < 0 => scroll up (inhale)
   const step = 0.08;
   breath = constrain(breath + (event.deltaY > 0 ? step : -step), 0, 1);
 }
 
 /* ---------- Hold/Drop helpers ---------- */
 function isHoldingAnything() {
   return camObj.held || cigObj.held;
 }
 function pickUp(which) {
   // ensure only one item at a time
   camObj.held = false;
   cigObj.held = false;
 
   if (which === "cam") {
     camObj.held = true;
   } else if (which === "cig") {
     cigObj.held = true;
   }
 }
 function dropHeld() {
   if (camObj.held) {
     camObj.held = false;
     camObj.x = camObj.homeX;
     camObj.y = camObj.homeY;
   } else if (cigObj.held) {
     cigObj.held = false;
     // drop near ashtray on desk
     cig.x = width * 0.685 - 6;
     cig.y = height * 0.74 - 4;
     cig.angle = -PI / 28;
   }
 }
 
 /* -------------------- Shared Scene Pieces -------------------- */
 function drawSunsetGradientAndSun() {
   // Interpolate palettes by mood, then push toward night by breath
   let cTop, cBottom, sunCol;
   if (mood === "calm") {
     cTop = color(64, 224, 208);
     cBottom = color(255, 182, 193);
     sunCol = color(palettes.calm.sun);
   } else {
     cTop = color(255, 140, 0);
     cBottom = color(255, 0, 0);
     sunCol = color(palettes.furious.sun);
   }
 
   // Night target colors
   const nightTop = color(15, 25, 45);
   const nightBottom = color(30, 30, 60);
 
   noStroke();
   for (let y = 0; y < height; y++) {
     const inter = y / height;
     let dayBlend = lerpColor(cTop, cBottom, inter);
     let nightBlend = lerpColor(nightTop, nightBottom, inter);
     let c = lerpColor(dayBlend, nightBlend, breath);
     fill(c);
     rect(0, y, width, 1);
   }
 
   const sunX = width * 0.725;
   const sunY = height * 0.31;
   const baseR = (mood === "calm") ? 110 : 95;
   const sunR = lerp(baseR, 60, breath);
   const sunA = lerp(170, 90, breath);
   fill(red(sunCol), green(sunCol), blue(sunCol), sunA);
   circle(sunX, sunY, sunR);
 }
 
 function drawRoom() {
   noStroke();
   fill(0, 35 + 40 * breath); // floor darkens with breath
   rect(0, height * 0.78, width, height * 0.22);
 
   fill(64, 224, 208, 210 - 60 * breath);
   rect(bedRect.x, bedRect.y, bedRect.w, bedRect.h, 14);
 
   fill(255, 182, 193, 230 - 80 * breath);
   rect(bedRect.pillow.x, bedRect.pillow.y, bedRect.pillow.w, bedRect.pillow.h, 10);
 
   fill(50, 50, 60, 180 + 30 * breath);
   rect(width * 0.6, height * 0.74, width * 0.25, height * 0.05, 8);
 
   const win = { x: width * 0.55, y: height * 0.18, w: width * 0.35, h: height * 0.3 };
   fill(230, 230, 240, 90 - 30 * breath);
   rect(win.x, win.y, win.w, win.h, 10);
 
   drawTriangularCurtains(win);
 
   push();
   drawingContext.save();
   drawingContext.beginPath();
   drawingContext.roundRect(win.x, win.y, win.w, win.h, 10);
   drawingContext.clip();
   noStroke();
   fill(255, 255, 255, 24 - 10 * breath);
   let rx = win.x + win.w * 0.1;
   for (let i = 0; i < 3; i++) {
     quad(rx + i * 18, win.y + 8,
          rx + i * 18 + 6, win.y + 18,
          rx + i * 18 + win.w * 0.2, win.y + win.h - 12,
          rx + i * 18 + win.w * 0.2 + 6, win.y + win.h - 2);
   }
   drawingContext.restore();
   pop();
 
   drawTriangularCurtains(win);
 
   drawAshtray(width * 0.685, height * 0.74 - 4, 36, 10);
 
   return win;
 }
 
 function drawTriangularCurtains(win) {
   stroke(60, 60, 70, 200);
   strokeWeight(4);
   line(win.x - 16, win.y - 8, win.x + win.w + 16, win.y - 8);
   noStroke();
 
   const col = (mood === "calm")
     ? color(255, 255, 255, 85 - 30 * breath)
     : color(255, 120, 90, 90 - 30 * breath);
 
   const swayAmp = (mood === "calm") ? 6 : 10;
   const swaySpeed = (mood === "calm") ? 0.02 : 0.04;
   const sway = sin(frameCount * swaySpeed) * swayAmp * (1 - 0.4 * breath);
 
   const cx = win.x + win.w * 0.5;
   const gap = 8;
 
   fill(col);
   beginShape();
   vertex(win.x, win.y);
   vertex(win.x + win.w * 0.5, win.y);
   vertex(cx - gap - 2, win.y + win.h + 8 + sway);
   vertex(win.x, win.y + win.h + 8);
   endShape(CLOSE);
 
   fill(col);
   beginShape();
   vertex(win.x + win.w * 0.5, win.y);
   vertex(win.x + win.w, win.y);
   vertex(win.x + win.w, win.y + win.h + 8);
   vertex(cx + gap + 2, win.y + win.h + 8 + sway);
   endShape(CLOSE);
 
   fill(255, 255, 255, 60 - 30 * breath);
   rect(win.x + win.w * 0.21, win.y + win.h * 0.48, 18, 5, 3);
   rect(win.x + win.w * 0.71, win.y + win.h * 0.48, 18, 5, 3);
 
   stroke(255, 255, 255, 28 - 18 * breath);
   strokeWeight(1);
   for (let i = 1; i <= 3; i++) {
     let px = lerp(win.x, win.x + win.w * 0.5, i / 4);
     line(px, win.y + 6, lerp(px, cx - gap - 2, 0.15), win.y + win.h + 6);
   }
   for (let i = 1; i <= 3; i++) {
     let px = lerp(win.x + win.w * 0.5, win.x + win.w, i / 4);
     line(px, win.y + 6, lerp(px, cx + gap + 2, 0.15), win.y + win.h + 6);
   }
   noStroke();
 }
 
 function drawAshtray(cx, cy, w, h) {
   fill(0, 40);
   ellipse(cx, cy + 6, w * 1.1, h * 0.9);
   fill(210, 210, 220, 220);
   ellipse(cx, cy, w, h);
   fill(180, 180, 190, 200);
   ellipse(cx, cy, w * 0.72, h * 0.55);
   fill(160, 160, 170, 220);
   arc(cx - w * 0.32, cy, 10, 8, PI * 0.8, PI * 1.2, OPEN);
 }
 
 /* ---------------------- Awake Person ---------------------- */
 function drawPerson() {
   const s = 1.25;
   const floorY = height * 0.78;
   const minX = width * 0.08;
   const maxX = width * 0.92;
 
   const px = constrain(mouseX, minX, maxX);
   const crouch = map(mouseY, 0, height, 0, 10 * s);
   const py = floorY - 42 * s + crouch;
 
   personPos.x = px;
   personPos.y = py;
 
   push();
   translate(px, py);
 
   const bob = sin(stepPhase) * ((mood === "calm") ? 2.5 * s : 4 * s);
 
   const shirt = (mood === "calm") ? color(80, 160, 200) : color(200, 80, 80);
   const pants = (mood === "calm") ? color(40, 90, 130)  : color(90, 30, 30);
   const skin  = color(245, 220, 200);
 
   noStroke();
   fill(0, 40);
   ellipse(0, 44 * s, 36 * s, 10 * s);
 
   fill(pants);
   rect(-10 * s, 10 * s + bob, 8 * s, 32 * s, 4 * s);
   rect( 2 * s, 10 * s - bob, 8 * s, 32 * s, 4 * s);
 
   fill(30, 30, 40);
   rect(-11 * s, 34 * s + bob, 12 * s, 4 * s, 2 * s);
   rect( 1 * s, 34 * s - bob, 12 * s, 4 * s, 2 * s);
 
   fill(shirt);
   rect(-14 * s, -12 * s, 28 * s, 26 * s, 7 * s);
 
   fill(skin);
   rect(-19 * s, -12 * s + (-bob), 6 * s, 22 * s, 3 * s);
   rect( 13 * s, -12 * s + ( bob), 6 * s, 22 * s, 3 * s);
 
   fill(skin);
   ellipse(0, -28 * s, 22 * s, 24 * s);
 
   fill(30);
   const eyeDY = (mood === "calm") ? 0 : 1 * s;
   circle(-4 * s, -26 * s + eyeDY, 2.6 * s);
   circle( 4 * s, -26 * s + eyeDY, 2.6 * s);
   stroke(30);
   strokeWeight(1.2 * s);
   line(-3 * s, -21 * s + eyeDY, 3 * s, -21 * s + eyeDY);
   noStroke();
 
   const handLocalX = 16 * s;
   const handLocalY = -12 * s + (sin(stepCount()) * ((mood === "calm") ? 2.5 * s : 4 * s)) + 22 * s;
   personHand.x = px + handLocalX;
   personHand.y = py + handLocalY;
 
   pop();
 }
 function stepCount() { return stepPhase; }
 
 /* ------------------------- Camera ------------------------- */
 function drawCamera() {
   if (camObj.held) {
     drawCameraSprite(personHand.x, personHand.y, true);
   } else {
     drawCameraSprite(camObj.x, camObj.y, false);
     if (overCamera(mouseX, mouseY)) {
       noFill();
       stroke(255, 230);
       rect(camObj.x - camObj.w/2 - 3, camObj.y - camObj.h/2 - 3, camObj.w + 6, camObj.h + 6, 4);
       noStroke();
     }
   }
 }
 
 function drawCameraSprite(cx, cy, held) {
   push();
   translate(cx, cy);
 
   if (!held) {
     fill(0, 45);
     ellipse(0, 10, camObj.w * 0.9, 6);
   }
 
   fill(35, 40, 50);
   rect(-camObj.w/2, -camObj.h/2, camObj.w, camObj.h, 4);
 
   fill(45, 50, 60);
   rect(-camObj.w/2 + 4, -camObj.h/2 - 6, camObj.w - 8, 6, 2);
 
   fill(20, 22, 25);
   ellipse(camObj.w*0.16, 0, camObj.h*0.9, camObj.h*0.9);
   fill(90, 140, 200, 180);
   ellipse(camObj.w*0.16, 0, camObj.h*0.5, camObj.h*0.5);
 
   fill(200, 70, 70);
   rect(-camObj.w/2 + 6, -camObj.h/2 - 5, 6, 4, 1);
 
   if (held) {
     stroke(60, 60, 70, 180);
     strokeWeight(2);
     noFill();
     arc(-camObj.w/2, -camObj.h/2, 24, 18, PI, TWO_PI);
     noStroke();
   }
 
   pop();
 }
 
 function overCamera(mx, my) {
   if (camObj.held) return false;
   return (
     mx >= camObj.x - camObj.w/2 &&
     mx <= camObj.x + camObj.w/2 &&
     my >= camObj.y - camObj.h/2 &&
     my <= camObj.y + camObj.h/2
   );
 }
 
 function isNearCamera() {
   if (camObj.held) return true;
   const d = dist(personPos.x, personPos.y, camObj.x, camObj.y);
   return d < 80;
 }
 
 /* --------------------- Matcha & Cigarette ---------------------- */
 function drawMatcha(cup) {
   fill(230, 230, 240, 160);
   ellipse(cup.x, cup.y + 16, 90, 24);
 
   fill(235, 235, 245, 210);
   ellipse(cup.x, cup.y, 86, 58);
 
   push();
   translate(cup.x, cup.y);
   fill(150, 200, 150, 230);
 
   beginShape();
   let rippleSpeed  = (mood === "calm") ? 0.04 : 0.08;
   let rippleAmp    = (mood === "calm") ? 1.8  : 3.0;
   let rippleDetail = 50;
 
   for (let angle = 0; angle < TWO_PI; angle += TWO_PI / rippleDetail) {
     let baseX = cos(angle) * 36;
     let baseY = sin(angle) * 11;
     let ripple = sin(angle * 4 + frameCount * rippleSpeed) * rippleAmp;
     vertex(baseX, baseY + ripple);
   }
   endShape(CLOSE);
   pop();
 }
 
 function drawCigarette(c) {
   c.emberX = c.x;
   c.emberY = c.y;
 
   push();
   translate(c.x, c.y);
   rotate(c.angle);
 
   noStroke();
   fill(245);
   rect(0, -c.thick / 2, c.len, c.thick, 4);
 
   fill(210, 150, 80);
   rect(c.len * 0.8, -c.thick / 2, c.len * 0.2, c.thick, 2);
 
   const emberSize = c.thick * 0.72;
   fill(255, random(80, 140), 0, random(190, 255));
   ellipse(0, 0, emberSize);
 
   fill(255, 120, 0, 60);
   ellipse(0, 0, emberSize * 1.8);
 
   pop();
 
   if (!cigObj.held) {
     cig.emberX = c.emberX;
     cig.emberY = c.emberY;
   }
 }
 
 function emitCigSmoke() {
   const sx = cigObj.held ? personHand.x : cig.emberX;
   const sy = cigObj.held ? personHand.y : cig.emberY;
   const near = dist(mouseX, mouseY, sx, sy) < 40;
 
   // Base cadence by mood; breath (exhale) increases density and bursts
   const baseRate = (mood === "calm") ? 7 : 4;
   const breathBoost = map(breath, 0, 1, 0, 2); // more bursts with breath
   const extra = near ? 0.5 : 0;
 
   cigEmitTimer++;
   if (cigEmitTimer % int(max(1, baseRate - extra)) === 0) {
     const bursts = (mood === "furious" ? 2 : 1) + floor(breathBoost);
     for (let i = 0; i < bursts; i++) {
       cigSmoke.push(new CigSmoke(sx, sy));
     }
   }
 }
 
 function updateDrawCigSmoke() {
   for (let i = cigSmoke.length - 1; i >= 0; i--) {
     cigSmoke[i].update();
     cigSmoke[i].display();
     if (cigSmoke[i].alpha <= 0) cigSmoke.splice(i, 1);
   }
 }
 
 class CigSmoke {
   constructor(x, y) {
     this.x = x + random(-2, 2);
     this.y = y + random(-2, 2);
     this.alpha = 160 + 50 * breath;       // denser with breath
     this.r = random(8, 16);
     this.t = random(1000);
     this.vy = random(-0.7, -0.3) * (1 + 0.3 * breath); // rises faster when exhaling
   }
   update() {
     let n = noise(this.t);
     let vx = map(n, 0, 1, -0.4, 0.4) * (1 + 0.2 * breath);
     this.x += vx;
     this.y += this.vy;
     this.t += 0.01;
     this.alpha -= 0.9;
     this.r += 0.08 + 0.04 * breath;
   }
   display() {
     noStroke();
     fill(230, this.alpha);
     ellipse(this.x, this.y, this.r);
   }
 }
 
 /* ---------- NEW: whispers that appear in heavy exhale ---------- */
 function drawWhispers() {
   // Spawn when breath is high
   if (breath > 0.6 && frameCount % 18 === 0 && whispers.length < 8) {
     const txt = random(whispersText);
     whispers.push({
       text: txt,
       x: random(width * 0.45, width * 0.9),
       y: random(height * 0.25, height * 0.7),
       a: 0, // alpha anim in
       life: 255,
       drift: random(-0.3, 0.3)
     });
   }
 
   for (let i = whispers.length - 1; i >= 0; i--) {
     const w = whispers[i];
     w.x += w.drift * (0.6 + 0.6 * breath);
     w.y -= 0.15 + 0.4 * breath;
     w.a = min(180, w.a + 8);
     w.life -= 1.5;
 
     push();
     fill(255, w.a * (w.life / 255));
     noStroke();
     textAlign(LEFT, BASELINE);
     textSize(14 + 4 * breath);
     text(w.text, w.x, w.y);
     pop();
 
     if (w.life <= 0) whispers.splice(i, 1);
   }
 }
 
 /* ---------- Subtle vignette that deepens with breath ---------- */
 function drawVignette(strength) {
   if (strength <= 0) return;
   const g = drawingContext.createRadialGradient(
     width/2, height/2, min(width, height) * 0.2,
     width/2, height/2, max(width, height) * 0.65
   );
   const dark = 0.35 * strength + 0.05;
   g.addColorStop(0, `rgba(0,0,0,0)`);
   g.addColorStop(1, `rgba(0,0,0,${dark})`);
   drawingContext.fillStyle = g;
   rect(0, 0, width, height);
 }
 
 /* ---------- UI helpers: bottom bar ---------- */
 function drawBottomBar(lines) {
   const pad = 12;
   const lineH = 18;
   const barH = pad * 2 + lineH * lines.length;
   const y = height - barH;
 
   noStroke();
   fill(0, 140);
   rect(0, y, width, barH);
 
   fill(255);
   textAlign(LEFT, TOP);
   textSize(14);
   let tx = pad;
   let ty = y + pad;
   for (let i = 0; i < lines.length; i++) {
     text(lines[i], tx, ty + i * lineH);
   }
 }
 
 /* ---------- tiny util ---------- */
 function drawGrain(alphaVal, count) {
   push();
   stroke(255, alphaVal);
   for (let i = 0; i < count; i++) {
     point(random(width), random(height));
   }
   pop();
 }
 
