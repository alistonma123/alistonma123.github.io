
/* --- Player remedy choice during a wave --- */
let calmTask = null; // "matcha" | "cig" | null
let rageChoice = { open: false, buttons: [] };

/* --- Rage / wave system (timed) --- */
let rage = {
  intervalMs: 90000,      // 1.5 minutes between waves (when calmed with matcha)
  nextAt: Infinity,       // next wave time (when the 3s countdown will begin)
  locked: false,          // true while a wave is active
  cigExhaleTicks: 0,      // progress for cig exhale path

  // damage-over-time bookkeeping while furious
  furiousStartMs: 0,
  lastDamageMs: 0,
  damagePhaseStarted: false
};

/* --- 3s pre-wave countdown --- */
let preWave = { active: false, endsAt: 0, durationMs: 3000 };

/* --- Health & consumables --- */
let health = { lives: 3, maxLives: 3 };
let consumables = { matchaLeft: 2, cigHitsLeft: 2 };

const EXHALE_THRESHOLD = 0.72;
const EXHALE_TICKS_REQUIRED = 18; // ~0.3s @ 60fps, adjust to taste

/* --- Core game state --- */
let gameState = "sleep"; // sleep -> awake -> keypad -> win -> lose
let wakeFade = 0;

let afterImage = null;
let afterAlpha = 0;
let flashAlpha = 0;

let mood = "calm";

/* --- Scene objects --- */
let cig;
let cigSmoke = [];
let cigEmitTimer = 0;

let ashtray = { x: 0, y: 0, w: 44, h: 12 }; // desk prop for spacing

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

/* --- Key object (pickup, hold, drop) --- */
let keyObj = {
  exists: false, // exists in the world
  held: false,
  x: 0, y: 0
};

let bedRect = { x: 0, y: 0, w: 0, h: 0, pillow: {x:0,y:0,w:0,h:0} };

/* --- Breath (0..1), only affected by scroll while holding cigarette --- */
let breath = 0.0;

/* --- Inventory + flags --- */
let inventory = []; // shows only what you currently carry
let flags = {
  photoRunes: false,
  drawerUnlocked: false,
  hasKey: false,
  doorOpened: false
};

/* --- Camera album (3 snaps max) --- */
let camera = {
  maxShots: 3,
  shotsLeft: 3,
  album: []   // array of p5.Image frames
};
let albumUI = { open: false, thumbBounds: [] };

/* --- Inventory Tab UI --- */
let invTab = { open: false, anim: 0, tabHit: {x:0,y:0,w:0,h:0} };

/* --- Door open animation --- */
let doorAnim = { state: "closed", progress: 0, openedAt: 0 };

const whispersText = [
  "the room remembers",
  "click, flash, forget",
  "turquoise promises",
  "bitter tobacco",
  "I was here before",
  "hold your breath",
  "three one four"
];
let whispers = [];

/* --- Keypad state --- */
let keypad = {
  open: false,
  entry: "",
  correctCode: "314",
  wrongFlash: 0
};

/* --- Hitboxes (computed in layout) --- */
let deskRect = { x: 0, y: 0, w: 0, h: 0 };
let drawerRect = { x: 0, y: 0, w: 0, h: 0 };
let doorRect = { x: 0, y: 0, w: 0, h: 0 };
let windowRect = { x: 0, y: 0, w: 0, h: 0 };

/* --- Matcha object --- */
let cupObj = { x: 0, y: 0, r: 42, sipAnim: 0, level: 1 };

/* --- Audio --- */
let sfx = {
  calm: null,     // CALM_MUSIC.mp3  (loops when mood = calm)
  fast: null,     // FAST_MUSIC.mp3  (loops when mood = furious)
  inhale: null,   // INHALE_CIG.mp3  (short sfx while scrolling with cig)
  drink: null,    // DRINKING.mp3    (on matcha sip)
  openDoor: null  // OPEN DOOR.mp3   (when door starts opening)
};
let audioReady = false;        // becomes true after first user gesture
let inhaleCooldownMs = 140;    // don't re-trigger inhale sfx too fast
let lastInhaleAt = -9999;

function preload() {
  soundFormats('mp3');
  sfx = {
    calm:     loadSound('assets/CALM_MUSIC.mp3'),
    fast:     loadSound('assets/FAST_MUSIC.mp3'),
    inhale:   loadSound('assets/INHALE_CIG.mp3'),
    drink:    loadSound('assets/DRINKING.mp3'),
    openDoor: loadSound('assets/OPEN DOOR.mp3')
  };

  // One-shots should always restart cleanly
  sfx.inhale && sfx.inhale.playMode('restart');
  sfx.drink && sfx.drink.playMode('restart');
  sfx.openDoor && sfx.openDoor.playMode('restart');
}


function setup() {
  const cnv = createCanvas(windowWidth, windowHeight);
  noStroke();
  layoutScene();

  cnv.style('display', 'block');
  cnv.style('position', 'fixed');
  cnv.style('top', '0');
  cnv.style('left', '0');

  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  window.scrollTo(0, 0);

  window.addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
  }, { passive: false });

  // Don't start audio here. We'll start & prime it on the first click (wake).
  const el = document.getElementById('loader');
  if (el) { el.classList.add('hidden'); setTimeout(() => el.remove(), 300); }
}


function ensureAudio() {
  if (!audioReady) {
    try { getAudioContext().resume(); } catch (e) {}
    audioReady = true;
  }
}
function playCalmMusic() {
  if (!audioReady) return;
  // fade calm up, fast down
  sfx.calm.setVolume(0.40, 0.12);  // target, rampSeconds
  sfx.fast.setVolume(0.00, 0.12);
}

function playFastMusic() {
  if (!audioReady) return;
  // fade fast up, calm down
  sfx.calm.setVolume(0.00, 0.12);
  sfx.fast.setVolume(0.45, 0.12);
}


function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  layoutScene();
}

function layoutScene() {
  deskRect = { x: width * 0.55, y: height * 0.74, w: width * 0.32, h: height * 0.05 };

  camObj.homeX = deskRect.x + 60;
  camObj.homeY = deskRect.y - 10;
  if (!camObj.held) { camObj.x = camObj.homeX; camObj.y = camObj.homeY; }

  ashtray.x = deskRect.x + deskRect.w * 0.72;
  ashtray.y = deskRect.y - 4;
  ashtray.w = 46; ashtray.h = 12;

  cig = {
    x: ashtray.x - 4, y: ashtray.y - 2,
    angle: -PI / 28, len: 78, thick: 10,
    emberX: 0, emberY: 0,
    homeX: ashtray.x - 4, homeY: ashtray.y - 2
  };

  // Bed
  bedRect.w = width * 0.30; bedRect.h = height * 0.10;
  bedRect.x = width * 0.12; bedRect.y = height * 0.68;
  bedRect.pillow = {
    x: bedRect.x + bedRect.w * 0.08,
    y: bedRect.y - bedRect.h * 0.35,
    w: bedRect.w * 0.35, h: bedRect.h * 0.35
  };

  // Drawer / door / window
  drawerRect = { x: deskRect.x + 24, y: deskRect.y - 26, w: 108, h: 22 };
  doorRect = { x: width * 0.04, y: height * 0.44, w: width * 0.08, h: height * 0.34 };
  windowRect = { x: width * 0.55, y: height * 0.18, w: width * 0.35, h: height * 0.3 };

  // Matcha cup
  cupObj.x = width * 0.75; cupObj.y = height * 0.85; cupObj.r = 42;
}

/* ---------- Rage: handle countdown + start wave ---------- */
function updateRageTimer() {
  if (gameState !== "awake") return;

  const now = millis();

  // Start 3s countdown when it's time
  if (!preWave.active && !rage.locked && now >= rage.nextAt) {
    preWave.active = true;
    preWave.endsAt = now + preWave.durationMs;

    calmTask = null;
    rage.cigExhaleTicks = 0;
    rageChoice.open = true;

    whispers.push({
      text: "GET CALM OR LOSE A LIFE",
      x: width * 0.12 + random(20, 60),
      y: height * 0.20 + random(-10, 10),
      a: 0, life: 255, drift: 0.25
    });
  }

  // When countdown ends, ALWAYS begin the furious wave
  if (preWave.active && now >= preWave.endsAt) {
    preWave.active = false;

    mood = "furious";
    rage.locked = true;
    rage.furiousStartMs = now;
    rage.lastDamageMs = 0;
    rage.damagePhaseStarted = false;

    // AUDIO: swap to fast music
    playFastMusic();
    // Keep the choice overlay open so the player can pick a remedy; it closes on selection.
  }
}


/* ---------- NEW: progress the cigarette remedy BEFORE damage ticks ---------- */
function updateCigaretteCalmProgress() {
  if (!(rage.locked && calmTask === "cig")) return;
  if (consumables.cigHitsLeft <= 0) return;
  if (!cigObj.held) return;

  if (breath > EXHALE_THRESHOLD) {
    rage.cigExhaleTicks++;
  } else {
    rage.cigExhaleTicks = max(0, rage.cigExhaleTicks - 1);
  }

  if (rage.cigExhaleTicks >= EXHALE_TICKS_REQUIRED) {
    consumables.cigHitsLeft = max(0, consumables.cigHitsLeft - 1);
    whispers.push({
      text: "smoke steadies you",
      x: personHand.x - 20, y: personHand.y - 30,
      a: 0, life: 255, drift: -0.2
    });
    resolveCig(); // sets mood to calm, unlocks, resets timers, returns cig to tray, clears from inventory
  }
}

/* ---------- Furious damage over time ---------- */
function updateFuriousDamage() {
  if (!rage.locked) return;

  // PAUSE damage if you're actively exhaling the cigarette remedy
  if (calmTask === "cig" && cigObj.held && breath > EXHALE_THRESHOLD) {
    return;
  }

  const now = millis();
  const elapsed = now - rage.furiousStartMs;

  // First damage at 5s, then every 2s
  if (elapsed >= 5000) {
    if (!rage.damagePhaseStarted) {
      // If the player never chose a remedy, FAINT on first tick (lose 1 life and reset to sleep)
      if (calmTask === null) { failAndResetToSleep("you faint"); return; }
      applyDamage("panic hits");
      rage.damagePhaseStarted = true;
      rage.lastDamageMs = now;
    } else if (now - rage.lastDamageMs >= 2000) {
      if (calmTask === null) { failAndResetToSleep("you faint"); return; }
      applyDamage("panic ticks");
      rage.lastDamageMs = now;
    }
  }
}

/* ---------- Damage & resolutions ---------- */
function applyDamage(reason) {
  if (health.lives <= 0) return;
  health.lives = max(0, health.lives - 1);

  flashAlpha = 160;

  whispers.push({
    text: reason || "heart stings",
    x: width * 0.08 + random(10, 30),
    y: height * 0.16 + random(-6, 6),
    a: 0, life: 255, drift: 0.2
  });

  if (health.lives <= 0) {
    gameState = "lose";
  }
}

function failAndResetToSleep(msg) {
  applyDamage(msg || "you faint"); // take exactly one life
  if (health.lives <= 0) return;

  // Reset out of the wave back to sleep
  rageChoice.open = false;
  preWave.active = false;
  calmTask = null;
  rage.cigExhaleTicks = 0;

  rage.locked = false;
  mood = "calm";
  breath = 0;
  rage.furiousStartMs = 0;
  rage.lastDamageMs = 0;
  rage.damagePhaseStarted = false;
  rage.nextAt = Infinity;

  // AUDIO: back to calm loop
  playCalmMusic();

  gameState = "sleep";
  wakeFade = 180;
}


function resolveMatcha() {
  mood = "calm";
  rage.locked = false;
  calmTask = null;
  breath = 0;
  rage.nextAt = millis() + rage.intervalMs; // 1.5m
  rage.damagePhaseStarted = false;
  rage.lastDamageMs = 0;
  rage.cigExhaleTicks = 0; // reset for next time

  // AUDIO: back to calm loop
  playCalmMusic();
}


function resolveCig() {
  mood = "calm";
  rage.locked = false;
  calmTask = null;
  breath = 0;
  rage.nextAt = millis() + 60000; // 1m calm
  rage.damagePhaseStarted = false;
  rage.lastDamageMs = 0;
  rage.cigExhaleTicks = 0;
  returnCigToHome();
  removeInventory("Cigarette"); // no longer holding it

  // AUDIO: back to calm loop
  playCalmMusic();
}


/* ---------- Choice Overlay ---------- */
function drawRageChoiceOverlay() {
  fill(0, 200); rect(0, 0, width, height);

  const pw = min(420, width * 0.9), ph = 210;
  const px = width/2 - pw/2, py = height/2 - ph/2;

  fill(20, 22, 30, 240); rect(px, py, pw, ph, 14);

  fill(255); textAlign(CENTER, TOP); textSize(18);
  if (preWave.active) text("GET CALM OR LOSE A LIFE", px + pw/2, py + 16);
  else text("Choose how to calm this wave", px + pw/2, py + 16);

  fill(220); textSize(13);
  const copy = "Matcha (1.5 min) or Cigarette (1 min).\nCigarette: pick it up, then scroll down to take one slow drag.";
  text(copy, px + pw/2, py + 44);

  if (preWave.active) {
    const secs = max(0, ceil((preWave.endsAt - millis()) / 1000));
    fill(255); textSize(28); text(secs.toString(), px + pw/2, py + 92);
  }

  const bw = (pw - 32 - 12) / 2, bh = 44;
  const by = py + ph - 64, bxL = px + 16, bxR = bxL + bw + 12;

  const matchaDisabled = consumables.matchaLeft <= 0;
  const cigDisabled    = consumables.cigHitsLeft <= 0;

  fill(matchaDisabled ? 70 : color(40, 120, 60));
  rect(bxL, by, bw, bh, 10);
  fill(255); textAlign(CENTER, CENTER); textSize(15);
  text(`Matcha (1.5m) — ${max(0, consumables.matchaLeft)} left`, bxL + bw/2, by + bh/2);

  fill(cigDisabled ? 70 : color(90, 90, 110));
  rect(bxR, by, bw, bh, 10);
  fill(255);
  text(`Cigarette (1m) — ${max(0, consumables.cigHitsLeft)} hit${consumables.cigHitsLeft===1?"":"s"} left`, bxR + bw/2, by + bh/2);

  rageChoice.buttons = [
    { id: "matcha", x: bxL, y: by, w: bw, h: bh, disabled: matchaDisabled },
    { id: "cig",    x: bxR, y: by, w: bw, h: bh, disabled: cigDisabled }
  ];
}

function handleRageChoiceClick(mx, my) {
  for (const b of rageChoice.buttons) {
    const hit = mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h;
    if (hit) {
      if (b.disabled) {
        whispers.push({ text: "that option is spent", x: b.x + 10, y: b.y - 10, a: 0, life: 200, drift: 0.1 });
        return;
      }
      calmTask = b.id;
      rageChoice.open = false;
      return;
    }
  }
}

/* ---------- Main draw ---------- */
function draw() {
  if (gameState === "sleep") {
    drawSleepScene();
    drawBottomBar([
      "Click the sleeping figure to wake up",
      "Press P to open your photo album",
      "Press I to see inventory"
    ]);
    return;
  }

  updateRageTimer();

  // Process cigarette calm progress BEFORE damage ticks
  updateCigaretteCalmProgress();

  updateFuriousDamage();
  updateDoorAnim();

  drawSunsetGradientAndSun();
  drawRoom();

  drawDoor();
  drawPerson();

  // Key rendering (in hand or world)
  if (keyObj.held) drawKeyInHand(personHand.x + 10, personHand.y + 6);
  else if (keyObj.exists) drawKeyWorld(keyObj.x, keyObj.y);

  drawCamera();

  drawMatcha(cupObj);

  if (cigObj.held) {
    drawCigarette({ x: personHand.x, y: personHand.y, angle: -PI/10, len: cig.len, thick: cig.thick, emberX:0, emberY:0 });
  } else {
    drawCigarette(cig);
  }

  emitCigSmoke();
  updateDrawCigSmoke();

  // Air clears gradually when not holding cigarette
  if (!cigObj.held) breath = lerp(breath, 0, 0.04);

  drawWhispers();
  drawWindowRunes();

  // HUD & overlays: keep health bar visible even when the choice overlay is open
  const worldBlocked = keypad.open || albumUI.open || gameState === "win" || gameState === "lose";
  const hudBlocked   = keypad.open || albumUI.open || gameState === "win" || gameState === "lose";

  if (!worldBlocked && !rageChoice.open) drawHoverHints();

  drawVignette(breath);

  // Top bars (hide on win/lose/keypad/album, but OK during rage choice)
  if (!hudBlocked) {
    drawInventoryBar();
    drawInventoryTab();
    if (!rageChoice.open) drawHealthBar(); // if choice overlay open, we’ll draw the health bar ABOVE it later
  }

  drawGrain(220, 18);

  if (afterImage && afterAlpha > 0) { push(); tint(255, afterAlpha); image(afterImage, 0, 0); pop(); afterAlpha -= 1.5; }
  if (flashAlpha > 0) { fill(255, flashAlpha); rect(0, 0, width, height); flashAlpha -= 15; }

  const lines = [];
  if (!hudBlocked && !rageChoice.open) {
    lines.push(`Mood: ${mood}${rage.locked ? " (overwhelmed)" : ""}`);
    lines.push(`Lives: ${health.lives}/${health.maxLives} • Matcha left: ${consumables.matchaLeft} • Cig hits left: ${consumables.cigHitsLeft}`);

    // NEW: drawer password objective hint in bottom text box
    if (!flags.drawerUnlocked) {
      lines.push(`Objective: Find clues for the drawer password.`);
    }

    if (!rage.locked && !preWave.active) {
      const msLeft = max(0, rage.nextAt - millis());
      const s = ceil(msLeft / 1000);
      const mm = floor(s / 60);
      const ss = (s % 60).toString().padStart(2, '0');
      lines.push(`Next wave in: ${mm}:${ss}`);
    } else if (rage.locked) {
      if (calmTask === null) {
        lines.push(`You’re spiraling — choose a remedy: Matcha (1.5m) or Cigarette (1m).`);
      } else if (calmTask === "matcha") {
        lines.push(`Chosen: Matcha — click the cup to calm (1.5 min). Left: ${consumables.matchaLeft}`);
      } else if (calmTask === "cig") {
        if (consumables.cigHitsLeft <= 0) lines.push(`Chosen: Cigarette — no hits left`);
        else if (!cigObj.held) lines.push(`Chosen: Cigarette — pick it up, then scroll down to exhale (1 min calm). Hits left: ${consumables.cigHitsLeft}`);
        else {
          const need = EXHALE_TICKS_REQUIRED;
          const pct = int(map(constrain(rage.cigExhaleTicks, 0, need), 0, need, 0, 100));
          lines.push(`Exhale (scroll down) with the cigarette: ${pct}% • Hits left: ${consumables.cigHitsLeft}`);
        }
      }
    }

    if (isHoldingAnything()) {
      let held = camObj.held ? "Camera" : cigObj.held ? "Cigarette" : keyObj.held ? "Brass Key" : "Item";
      lines.push(`Hold: ${held} • Press D to drop`);
      if (camObj.held) lines.push(`Action: Click to snap a photo (${camera.shotsLeft}/${camera.maxShots} left) • Press P to open album`);
      if (keyObj.held) lines.push(`Tip: Walk to the door and click to unlock`);
    } else {
      lines.push(`Pickups: Camera — move close and click; Cigarette — click near the tip; Key — near drawer when found`);
    }

    // NEW: inventory hint always visible while playing
    lines.push("Press I to see inventory");

    if (camera.album.length > 0) lines.push("Press P to view your album.");
    if (flags.drawerUnlocked && !flags.hasKey) lines.push(`The drawer is open — pick up the key.`);
    if (flags.hasKey) lines.push(`You have the key — click the door while holding it to escape.`);
    if (breath > 0.6 && !flags.photoRunes) lines.push(`Hint: Runic marks glow on the window when you exhale. Try photographing them.`);

    drawBottomBar(lines);
  }

  const dx = mouseX - lastMouseX;
  stepPhase += constrain(abs(dx) * 0.02, 0, 0.3);
  lastMouseX = mouseX;

  if (wakeFade > 0) { fill(0, wakeFade); rect(0, 0, width, height); wakeFade -= 6; }

  // Overlays (drawn last). If rage choice is open, put the HEALTH BAR ABOVE it.
  if (keypad.open) drawKeypadOverlay();
  if (albumUI.open) drawAlbumOverlay();
  if (gameState === "win") drawWinOverlay();
  if (gameState === "lose") drawLoseOverlay();
  if (rageChoice.open) { drawRageChoiceOverlay(); drawHealthBar(); }
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
  noStroke();
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
  rect(bedRect.pillow.x, bedRect.pillow.y, bedRect.pillow.w, bedRect.h * 0.35, 10);

  fill(40, 40, 50, 160);
  rect(deskRect.x, deskRect.y, deskRect.w, deskRect.h, 8);

  fill(220, 230, 255, 40);
  rect(windowRect.x, windowRect.y, windowRect.w, windowRect.h, 10);

  push();
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.roundRect(windowRect.x, windowRect.y, windowRect.w, windowRect.h, 10);
  drawingContext.clip();
  noStroke();
  fill(255, 255, 255, 18);
  let rx = windowRect.x + windowRect.w * 0.1;
  for (let i = 0; i < 3; i++) {
    quad(rx + i * 18, windowRect.y + 8,
         rx + i * 18 + 6, windowRect.y + 18,
         rx + i * 18 + windowRect.w * 0.2, windowRect.y + windowRect.h - 12,
         rx + i * 18 + windowRect.w * 0.2 + 6, windowRect.y + windowRect.h - 2);
  }
  drawingContext.restore();
  pop();

  drawTriangularCurtains(windowRect);
  drawBedSign();
}

function drawSleepingPerson() {
  const px = bedRect.x + bedRect.w * 0.28;
  const py = bedRect.y + bedRect.h * 0.48;
  const breatheZ = sin(frameCount * 0.03) * 2;

  noStroke();
  fill(0, 40);
  ellipse(px + 20, py + 34, 36, 10);

  const skin = color(245, 220, 200);
  const shirt = color(70, 120, 160);

  fill(shirt);
  rect(px - 12, py - 6 + breatheZ, 24, 20, 6);

  fill(skin);
  ellipse(px - 22, py - 16, 18, 20);

  fill(30, 30, 40, 220);
  rect(px - 8, py - 10 + breatheZ, 6, 16, 3);
  rect(px + 2, py - 10 + breatheZ, 6, 16, 3);

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

/* -------------------- Input -------------------- */

function mousePressed() {
  // Album overlay eats clicks
  if (albumUI.open) return;

  // Inventory tab toggle by clicking tab
  const t = invTab.tabHit;
  if (mouseX >= t.x && mouseX <= t.x + t.w && mouseY >= t.y && mouseY <= t.y + t.h) {
    invTab.open = !invTab.open; return;
  }

  // Choice overlay gets priority
  if (rageChoice.open) { handleRageChoiceClick(mouseX, mouseY); return; }

  // Block interactions on win/lose screens
  if (gameState === "win" || gameState === "lose") return;

  if (gameState === "sleep") {
  if (isClickOnSleeper(mouseX, mouseY)) {
    gameState = "awake";
    wakeFade = 180;
    rage.nextAt = millis() + rage.intervalMs;
    rage.locked = false;

    // AUDIO: first gesture → enable, start BOTH loops muted, then fade to calm
    ensureAudio();
    if (audioReady) {
      // start loops only once
      if (!sfx.calm.isPlaying()) sfx.calm.loop();
      if (!sfx.fast.isPlaying()) sfx.fast.loop();
      sfx.calm.setVolume(0.00);
      sfx.fast.setVolume(0.00);
      playCalmMusic(); // fade to calm
    }
  }
  return;
}


  if (keypad.open) { handleKeypadClick(mouseX, mouseY); return; }

  // --- Matcha drinking (priority) ---
  if (overCup(mouseX, mouseY)) { drinkMatcha(); return; }

  // If holding camera, clicking snaps a photo
  if (camObj.held) { snapPhoto(); return; }

  // If holding cigarette, clicking does nothing special (ambient). Allow key to interact with door.
  if (cigObj.held) return;

  // Pickup logic: only when nothing is held
  if (!isHoldingAnything()) {
    // Key on ground / near drawer
    if (keyObj.exists && dist(mouseX, mouseY, keyObj.x, keyObj.y) < 28) {
      pickUp("key");
      ensureInventory("Brass Key");
      return;
    }
    // Try cigarette (click near tip)
    if (dist(mouseX, mouseY, cig.x, cig.y) < 40) {
      pickUp("cig");
      ensureInventory("Cigarette");
      return;
    }
    // Then camera (must be near)
    if (overCamera(mouseX, mouseY) && isNearCamera()) {
      pickUp("cam");
      ensureInventory("Camera");
      return;
    }
  }

  // Door interactions (works when holding key)
  if (overRect(doorRect)) {
    if (doorAnim.state === "closed") {
      if (keyObj.held) {
        // consume key and start animation
        keyObj.held = false;
        keyObj.exists = false;
        removeInventory("Brass Key");
        flags.hasKey = false;
        doorAnim.state = "opening";
        doorAnim.progress = 0;

        // AUDIO: door opening once
        ensureAudio();
        if (audioReady) sfx.openDoor.play();

        whispers.push({ text: "the lock turns", x: doorRect.x + 8, y: doorRect.y - 12, a:0, life:240, drift:0.1 });
      } else if (flags.hasKey) {
        whispers.push({ text: "hold the key, then click", x: doorRect.x + 8, y: doorRect.y - 12, a:0, life:220, drift:0.1 });
      } else {
        flashAlpha = 120; // nudge
      }
    }
    return;
  }

  // Interact with drawer (open keypad if still locked)
  if (overRect(drawerRect) && !flags.drawerUnlocked) {
    keypad.open = true;
    gameState = "keypad";
    return;
  }
}


function keyPressed() {
  // Toggle album with P
  if (key === 'p' || key === 'P') {
    if (!keypad.open) albumUI.open = !albumUI.open;
  }
  if (albumUI.open && (key === 'Escape' || key === 'q' || key === 'Q')) albumUI.open = false;

  // Toggle inventory tab with I
  if (key === 'i' || key === 'I') invTab.open = !invTab.open;

  // Restart on win/lose
  if ((gameState === "win" || gameState === "lose") && (key === 'r' || key === 'R')) { resetGame(); return; }

  if (gameState === "sleep") return;

  if (key === 'D' || key === 'd') dropHeld();
  if (gameState === "keypad" && (key === 'Escape' || key === 'q')) closeKeypad();
}

/* -------- Scroll to control breath (inhale/exhale) -------- */
function mouseWheel(event) {
  if (!cigObj.held) return false;
  const step = 0.08;
  breath = constrain(breath + (event.deltaY > 0 ? step : -step), 0, 1);

  // AUDIO: inhale SFX (throttled)
  ensureAudio();
  const now = millis();
  if (now - lastInhaleAt > inhaleCooldownMs) {
    lastInhaleAt = now;
    if (audioReady) sfx.inhale.play();
  }
  return false;
}


function cueCigaretteHint() {
  const base = "inhale it — find a way to inhale it";
  for (let i = 0; i < 3; i++) {
    whispers.push({
      text: base,
      x: personHand.x + random(-80, 80),
      y: personHand.y + random(-40, 40),
      a: 0,
      life: 220 + i * 20,
      drift: random(-0.35, 0.35)
    });
  }
}

/* ---------- Hold/Drop helpers ---------- */
function isHoldingAnything() { return camObj.held || cigObj.held || keyObj.held; }

function pickUp(which) {
  camObj.held = false; cigObj.held = false; keyObj.held = false;

  if (which === "cam") {
    camObj.held = true;
  } else if (which === "cig") {
    cigObj.held = true;
    cueCigaretteHint();

    // If a wave is active and the player hasn't chosen yet, auto-choose Cigarette
    if (rage.locked && calmTask === null) calmTask = "cig";
  } else if (which === "key") {
    keyObj.held = true; keyObj.exists = true;
  }
}

function dropHeld() {
  if (camObj.held) {
    camObj.held = false;
    camObj.x = camObj.homeX; camObj.y = camObj.homeY;
    removeInventory("Camera");
  } else if (cigObj.held) {
    cigObj.held = false;
    cig.x = cig.homeX; cig.y = cig.homeY; cig.angle = -PI / 28;
    removeInventory("Cigarette");
  } else if (keyObj.held) {
    keyObj.held = false;
    keyObj.exists = true;
    keyObj.x = personHand.x; keyObj.y = personHand.y;
    removeInventory("Brass Key");
    flags.hasKey = false;
  }
}

function returnCigToHome() {
  cigObj.held = false;
  cig.x = cig.homeX; cig.y = cig.homeY; cig.angle = -PI / 28;
}

function ensureInventory(item) {
  if (!inventory.includes(item)) inventory.push(item);
  flags.hasKey = inventory.includes("Brass Key");
}
function removeInventory(item) {
  const i = inventory.indexOf(item);
  if (i >= 0) inventory.splice(i, 1);
  flags.hasKey = inventory.includes("Brass Key");
}

/* -------------------- Shared Scene Pieces -------------------- */
function drawSunsetGradientAndSun() {
  let cTop, cBottom;
  if (mood === "calm") {
    cTop = color(64, 224, 208);
    cBottom = color(255, 182, 193);
  } else {
    cTop = color(255, 140, 0);
    cBottom = color(255, 0, 0);
  }

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
  const sunColRGB = color(palettes[mood === "calm" ? "calm" : "furious"].sun);
  fill(red(sunColRGB), green(sunColRGB), blue(sunColRGB), sunA);
  circle(sunX, sunY, sunR);
}

function drawRoom() {
  noStroke();
  fill(0, 35 + 40 * breath);
  rect(0, height * 0.78, width, height * 0.22);

  fill(64, 224, 208, 210 - 60 * breath);
  rect(bedRect.x, bedRect.y, bedRect.w, bedRect.h, 14);

  fill(255, 182, 193, 230 - 80 * breath);
  rect(bedRect.pillow.x, bedRect.pillow.y, bedRect.pillow.w, bedRect.h * 0.35, 10);

  // Desk
  fill(50, 50, 60, 180 + 30 * breath);
  rect(deskRect.x, deskRect.y, deskRect.w, deskRect.h, 8);

  // Drawer front (shows gap when unlocked)
  if (!flags.drawerUnlocked) {
    fill(90, 90, 110, 200);
    rect(drawerRect.x, drawerRect.y, drawerRect.w, drawerRect.h, 4);
    fill(200);
    ellipse(drawerRect.x + drawerRect.w - 12, drawerRect.y + drawerRect.h/2, 6, 6);
  } else {
    fill(90, 90, 110, 180);
    rect(drawerRect.x, drawerRect.y + 8, drawerRect.w, drawerRect.h, 4);
    if (!flags.hasKey && keyObj.exists && !keyObj.held) drawKeyIcon(drawerRect.x + 24, drawerRect.y + 18);
  }

  // Window frame
  fill(230, 230, 240, 90 - 30 * breath);
  rect(windowRect.x, windowRect.y, windowRect.w, windowRect.h, 10);

  drawTriangularCurtains(windowRect);

  // Window highlights
  push();
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.roundRect(windowRect.x, windowRect.y, windowRect.w, windowRect.h, 10);
  drawingContext.clip();
  noStroke();
  fill(255, 255, 255, 24 - 10 * breath);
  let rx = windowRect.x + windowRect.w * 0.1;
  for (let i = 0; i < 3; i++) {
    quad(rx + i * 18, windowRect.y + 8,
         rx + i * 18 + 6, windowRect.y + 18,
         rx + i * 18 + windowRect.w * 0.2, windowRect.y + windowRect.h - 12,
         rx + i * 18 + windowRect.w * 0.2 + 6, windowRect.y + windowRect.h - 2);
  }
  drawingContext.restore();
  pop();

  drawAshtray(ashtray.x, ashtray.y, ashtray.w, ashtray.h);
  drawBedSign();
}

function drawBedSign() {
  const sx = bedRect.x + bedRect.w * 0.5;
  const sy = bedRect.y - 28;
  const sw = bedRect.w * 0.9;
  const sh = 26;

  fill(20, 22, 30, 210);
  rect(sx - sw/2, sy, sw, sh, 8);

  if (mood === "furious" || preWave.active) {
    noFill();
    stroke(255, 100, 100, 120 + 80 * abs(sin(frameCount * 0.08)));
    strokeWeight(1.6);
    rect(sx - sw/2, sy, sw, sh, 8);
    noStroke();
  }

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(12);
  text("escape this room, you are unstable here", sx, sy + sh/2 + 1);
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

/* ---------------------- Door (with animation) ---------------------- */
function updateDoorAnim() {
  if (doorAnim.state === "opening") {
    doorAnim.progress = min(1, doorAnim.progress + 0.04); // ~25 frames
    if (doorAnim.progress >= 1) {
      doorAnim.state = "open";
      flags.doorOpened = true;
      doorAnim.openedAt = millis();
    }
  } else if (doorAnim.state === "open") {
    if (gameState !== "win" && millis() - doorAnim.openedAt > 600) gameState = "win";
  }
}

function drawDoor() {
  const d = doorRect;

  // Door frame
  fill(60, 60, 75, 220);
  rect(d.x, d.y, d.w, d.h, 6);

  // Bright beyond
  fill(255, 255, 210, 220);
  rect(d.x + 6, d.y + 6, d.w - 12, d.h - 12, 4);

  // Rotating door panel
  push();
  translate(d.x + 6, d.y + 6); // hinge at left/top inner frame
  const ang = -HALF_PI * doorAnim.progress; // 0 -> -90°
  rotate(ang);
  fill(40, 45, 60, 255);
  rect(0, 0, d.w - 12, d.h - 12, 6);
  // knob (transformed with panel)
  fill(220);
  ellipse((d.w - 12) - 14, (d.h - 12)/2, 8, 8);
  pop();

  fill(255, 255, 255, 80);
  textSize(12);
  textAlign(CENTER, TOP);
  text(doorAnim.state === "open" ? "OPEN" : "DOOR", d.x + d.w/2, d.y - 16);
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

  personPos.x = px; personPos.y = py;

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

/* ------------------------- Key visuals ------------------------- */
function drawKeyIcon(x, y) {
  push();
  translate(x, y);
  noStroke();
  fill(230, 210, 120);
  ellipse(0, 0, 10, 10);
  rect(5, -2, 16, 4, 2);
  rect(18, -2, 4, 10, 1);
  pop();
}
function drawKeyInHand(x, y) { drawKeyIcon(x, y); }
function drawKeyWorld(x, y) {
  // glow
  noStroke(); fill(255, 255, 150, 70); ellipse(x, y + 8, 26, 10);
  drawKeyIcon(x, y);
}

/* ------------------------- Camera ------------------------- */
function drawCamera() {
  if (camObj.held) {
    drawCameraSprite(personHand.x, personHand.y, true);
  } else {
    drawCameraSprite(camObj.x, camObj.y, false);
    if (overCamera(mouseX, mouseY)) {
      noFill(); stroke(255, 230);
      rect(camObj.x - camObj.w/2 - 3, camObj.y - camObj.h/2 - 3, camObj.w + 6, camObj.h + 6, 4);
      noStroke();
    }
  }
}

function drawCameraSprite(cx, cy, held) {
  push();
  translate(cx, cy);

  if (!held) { fill(0, 45); ellipse(0, 10, camObj.w * 0.9, 6); }

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
  return (mx >= camObj.x - camObj.w/2 && mx <= camObj.x + camObj.w/2 &&
          my >= camObj.y - camObj.h/2 && my <= camObj.y + camObj.h/2);
}

function isNearCamera() {
  if (camObj.held) return true;
  const d = dist(personPos.x, personPos.y, camObj.x, camObj.y);
  return d < 80;
}

function snapPhoto() {
  if (camera.shotsLeft <= 0) {
    whispers.push({ text: "film is spent", x: personHand.x - 30, y: personHand.y - 30, a: 0, life: 220, drift: 0.1 });
    flashAlpha = 120; return;
  }

  flashAlpha = 255;
  const frameShot = get();
  afterImage = frameShot.get(); afterAlpha = 140;

  camera.album.push(frameShot);
  camera.shotsLeft = max(0, camera.shotsLeft - 1);
  ensureInventory("Photo Album");

  if (breath > 0.6) {
    const mx = personHand.x, my = personHand.y;
    if (mx > windowRect.x && mx < windowRect.x + windowRect.w && my > windowRect.y - 40 && my < windowRect.y + windowRect.h + 40) {
      if (!flags.photoRunes) {
        flags.photoRunes = true;
        ensureInventory("Rune Photo");
        whispers.push({ text: "memory saved", x: windowRect.x + windowRect.w - 120, y: windowRect.y + windowRect.h - 16, a: 0, life: 255, drift: random(-0.3, 0.3) });
      }
    }
  }

  whispers.push({ text: `snap! (${camera.maxShots - camera.shotsLeft}/${camera.maxShots})`, x: personHand.x - 40, y: personHand.y - 34, a: 0, life: 240, drift: -0.15 });
}

/* --------------------- Matcha & Cigarette ---------------------- */
function drawMatcha(cup) {
  fill(230, 230, 240, 160); ellipse(cup.x, cup.y + 16, 90, 24);
  fill(235, 235, 245, 210); ellipse(cup.x, cup.y, 86, 58);

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

  if (breath > 0.6) {
    fill(255, 255, 255, 100); textAlign(CENTER, CENTER); textSize(12); text("π", 0, -2);
  }

  if (cup.sipAnim > 0.02) {
    for (let i = 0; i < 6; i++) {
      const t = frameCount * 0.02 + i * 0.7;
      const rise = (1 - (i / 6)) * 24 * cup.sipAnim;
      fill(255, 255, 255, 120 * cup.sipAnim);
      noStroke();
      ellipse(cos(t) * 6, -10 - rise + sin(t * 2) * 2, 6 - i * 0.6, 4 - i * 0.4);
    }
    cup.sipAnim *= 0.92;
  }
  pop();

  if (rage.locked) {
    noFill();
    stroke(160, 220, 160, 120 + 80 * abs(sin(frameCount * 0.08)));
    strokeWeight(2);
    ellipse(cup.x, cup.y, 92, 64);
    noStroke();
  }
}

function overCup(mx, my) {
  const dx = mx - cupObj.x, dy = my - cupObj.y;
  const rx = 43, ry = 29;
  return (dx*dx)/(rx*rx) + (dy*dy)/(ry*ry) <= 1.0;
}

function drinkMatcha() {
  cupObj.sipAnim = 1.0;

  // AUDIO: sip (force a clean restart)
  ensureAudio();
  if (audioReady && sfx.drink) { sfx.drink.stop(); sfx.drink.play(); }

  if (rage.locked) {
    if (calmTask === "matcha") {
      if (consumables.matchaLeft > 0) {
        consumables.matchaLeft--;
        whispers.push({ text: "mint settles you", x: cupObj.x - 40, y: cupObj.y - 24, a: 0, life: 255, drift: -0.2 });
        resolveMatcha();
      } else {
        whispers.push({ text: "the cup is empty", x: cupObj.x - 36, y: cupObj.y - 18, a: 0, life: 220, drift: 0.1 });
      }
    } else {
      whispers.push({ text: "not what you need", x: cupObj.x - 36, y: cupObj.y - 18, a: 0, life: 220, drift: 0.1 });
    }
    return;
  }
  whispers.push({ text: "warm & grassy", x: cupObj.x - 36, y: cupObj.y - 18, a: 0, life: 220, drift: 0.1 });
}


function drawCigarette(c) {
  c.emberX = c.x; c.emberY = c.y;
  push(); translate(c.x, c.y); rotate(c.angle);
  noStroke(); fill(245); rect(0, -c.thick / 2, c.len, c.thick, 4);
  fill(210, 150, 80); rect(c.len * 0.8, -c.thick / 2, c.len * 0.2, c.thick, 2);
  const emberSize = c.thick * 0.72;
  fill(255, random(80, 140), 0, random(190, 255)); ellipse(0, 0, emberSize);
  fill(255, 120, 0, 60); ellipse(0, 0, emberSize * 1.8);
  pop();
  if (!cigObj.held) { cig.emberX = c.emberX; cig.emberY = c.emberY; }
}

function emitCigSmoke() {
  const sx = cigObj.held ? personHand.x : cig.emberX;
  const sy = cigObj.held ? personHand.y : cig.emberY;
  const near = dist(mouseX, mouseY, sx, sy) < 40;

  const baseRate = (mood === "calm") ? 7 : 4;
  const breathBoost = map(breath, 0, 1, 0, 2);
  const extra = near ? 0.5 : 0;

  cigEmitTimer++;
  if (cigEmitTimer % int(max(1, baseRate - extra)) === 0) {
    const bursts = (mood === "furious" ? 2 : 1) + floor(breathBoost);
    for (let i = 0; i < bursts; i++) cigSmoke.push(new CigSmoke(sx, sy));
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
    this.alpha = 160 + 50 * breath;
    this.r = random(8, 16);
    this.t = random(1000);
    this.vy = random(-0.7, -0.3) * (1 + 0.3 * breath);
  }
  update() {
    let n = noise(this.t);
    let vx = map(n, 0, 1, -0.4, 0.4) * (1 + 0.2 * breath);
    this.x += vx; this.y += this.vy;
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

/* ---------- Hover hints ---------- */
function drawHoverHints() {
  if (!cigObj.held && dist(mouseX, mouseY, cig.x, cig.y) < 40) {
    noFill(); stroke(255, 230); strokeWeight(1.5); ellipse(cig.x, cig.y, 64, 26); noStroke();
  }

  if (overCup(mouseX, mouseY)) {
    noFill(); stroke(255, 230); strokeWeight(1.5); ellipse(cupObj.x, cupObj.y, 96, 68); noStroke();
  }

  if (overRect(drawerRect) && !flags.drawerUnlocked) {
    noFill(); stroke(255, 230); strokeWeight(1.5); rect(drawerRect.x - 3, drawerRect.y - 3, drawerRect.w + 6, drawerRect.h + 6, 6); noStroke();
  }

  if (overRect(doorRect)) {
    noFill(); stroke(255, 230); strokeWeight(1.5); rect(doorRect.x - 3, doorRect.y - 3, doorRect.w + 6, doorRect.h + 6, 6); noStroke();
  }

  if (keyObj.exists && !keyObj.held && dist(mouseX, mouseY, keyObj.x, keyObj.y) < 28) {
    noFill(); stroke(255, 230); strokeWeight(1.5); ellipse(keyObj.x, keyObj.y, 32, 18); noStroke();
  }
}

/* ---------- whispers ---------- */
function drawWhispers() {
  if (breath > 0.6 && frameCount % 18 === 0 && whispers.length < 8) {
    const txt = random(whispersText);
    whispers.push({ text: txt, x: random(width * 0.45, width * 0.9), y: random(height * 0.25, height * 0.7), a: 0, life: 255, drift: random(-0.3, 0.3) });
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

/* ---------- Window runes ---------- */
function drawWindowRunes() {
  if (breath <= 0.6) return;
  push();
  const rx = windowRect.x + windowRect.w * 0.1;
  const ry = windowRect.y + windowRect.h * 0.2;
  const rSpacing = windowRect.w * 0.25;
  const alpha = map(breath, 0.6, 1, 0, 180);

  textAlign(CENTER, CENTER); textSize(22); noStroke();
  fill(255, alpha);      text("Ϟ", rx + 0 * rSpacing, ry + sin(frameCount * 0.03) * 2);
  fill(255, alpha * .9); text("|", rx + 1 * rSpacing, ry + cos(frameCount * 0.025) * 2);
  fill(255, alpha * .95);text("Ѵ", rx + 2 * rSpacing, ry + sin(frameCount * 0.02 + 1) * 2);
  pop();
}

/* ---------- Vignette ---------- */
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

/* ---------- Inventory bar (top) ---------- */
function drawInventoryBar() {
  const h = 30;
  fill(0, 120); rect(0, 0, width, h);
  fill(255); textSize(13); textAlign(LEFT, CENTER);

  const items = [];
  for (const it of inventory) {
    if (it === "Camera") items.push(`Camera (${camera.shotsLeft}/${camera.maxShots})`);
    else if (it === "Photo Album") items.push(`Photo Album (${camera.album.length}/${camera.maxShots})`);
    else items.push(it);
  }
  const label = "Inventory: " + (items.length === 0 ? "(empty)" : items.join(" • "));
  text(label, 10, h/2);
}

/* ---------- Slide-out Inventory Tab ---------- */
function drawInventoryTab() {
  const W = 220, R = 14;
  invTab.anim = lerp(invTab.anim, invTab.open ? 1 : 0, 0.15);

  const x = width - lerp(0, W, invTab.anim);
  const y = 40;
  const h = 130;

  // Panel
  fill(20, 22, 30, 220);
  rect(x, y, W, h, R);

  // Title + held
  fill(255); textSize(14); textAlign(LEFT, TOP);
  text("Inventory", x + 12, y + 10);
  const held = camObj.held ? "Camera" : cigObj.held ? "Cigarette" : keyObj.held ? "Brass Key" : "None";
  fill(200); textSize(12);
  text(`Held: ${held}`, x + 12, y + 30);

  // Items list
  const listY = y + 50;
  textSize(12); fill(220);
  if (inventory.length === 0) text("(empty)", x + 12, listY);
  else {
    let yy = listY;
    for (const it of inventory) { text("• " + it, x + 12, yy); yy += 16; }
  }

  // Tab handle
  const tabW = 24, tabH = 64;
  const tabX = x - tabW; const tabY = y + 8;
  fill(30, 32, 45, 230);
  rect(tabX, tabY, tabW, tabH, R);
  fill(255); textAlign(CENTER, CENTER); textSize(12);
  text("I\nn\nv", tabX + tabW/2, tabY + tabH/2);

  invTab.tabHit = { x: tabX, y: tabY, w: tabW, h: tabH };
}

/* ---------- BIG Health bar ---------- */
function drawHealthBar() {
  const labelY = 34;
  fill(255); textAlign(LEFT, TOP); textSize(12); text("Health", 10, labelY);

  const w = 40, h = 14, gap = 10;
  const x0 = 10; const y0 = labelY + 14 + 4;

  for (let i = 0; i < health.maxLives; i++) {
    const alive = i < health.lives;
    noStroke(); fill(0, 0, 0, 80); rect(x0 + i * (w + gap), y0 + 2, w, h, 4);
    fill(alive ? color(230, 60, 60) : color(80, 80, 95)); rect(x0 + i * (w + gap), y0, w, h, 4);
  }
}

/* ---------- Bottom bar ---------- */
function drawBottomBar(lines) {
  const pad = 12, lineH = 18, barH = pad * 2 + lineH * lines.length, y = height - barH;
  noStroke(); fill(0, 140); rect(0, y, width, barH);
  fill(255); textAlign(LEFT, TOP); textSize(14);
  let tx = pad, ty = y + pad;
  for (let i = 0; i < lines.length; i++) text(lines[i], tx, ty + i * lineH);
}

/* ---------- tiny util ---------- */
function drawGrain(alphaVal, count) { push(); stroke(255, alphaVal); for (let i = 0; i < count; i++) point(random(width), random(height)); pop(); }
function overRect(r) { return mouseX >= r.x && mouseX <= r.x + r.w && mouseY >= r.y && mouseY <= r.y + r.h; }

/* ---------- Keypad Overlay ---------- */
function drawKeypadOverlay() {
  fill(0, 200); rect(0, 0, width, height);

  const pw = 240, ph = 300;
  const px = width/2 - pw/2, py = height/2 - ph/2;
  fill(30, 35, 50); rect(px, py, pw, ph, 12);

  fill(255); textAlign(CENTER, TOP); textSize(16); text("DRAWER KEYPAD", px + pw/2, py + 12);

  // NEW: gentle nudge line under the title
  fill(220); textSize(12);
  text("Find clues for the password around the room.", px + pw/2, py + 32);

  const displayH = 38;
  fill(10, 10, 15); rect(px + 16, py + 44, pw - 32, displayH, 6);
  let disp = keypad.entry.padEnd(3, "•");
  if (keypad.wrongFlash > 0) { fill(255, 80, 80); keypad.wrongFlash -= 4; } else fill(220);
  textSize(22); textAlign(CENTER, CENTER); text(disp, px + pw/2, py + 44 + displayH/2);

  let buttons = ["1","2","3","4","5","6","7","8","9","←","0","✓"];

  const bw = 60, bh = 38, gap = 8;
  const bx0 = px + (pw - (bw*3 + gap*2))/2;
  const by0 = py + 44 + displayH + 14;

  textSize(18);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    const label = buttons[r*3 + c], bx = bx0 + c*(bw + gap), by = by0 + r*(bh + gap);
    fill(60, 70, 90); rect(bx, by, bw, bh, 6);
    fill(255); textAlign(CENTER, CENTER); text(label, bx + bw/2, by + bh/2);
  }

  fill(255, 220); textSize(12); textAlign(CENTER, TOP);
  text("Press Esc or Q to close", px + pw/2, py + ph - 20);
}

function handleKeypadClick(mx, my) {
  const pw = 240, ph = 300, px = width/2 - pw/2, py = height/2 - ph/2;
  const bw = 60, bh = 38, gap = 8;
  const bx0 = px + (pw - (bw*3 + gap*2))/2;
  const by0 = py + 44 + 38 + 14;
  let buttons = ["1","2","3","4","5","6","7","8","9","←","0","✓"];

  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    const bx = bx0 + c*(bw + gap), by = by0 + r*(bh + gap);
    if (mx >= bx && mx <= bx + bw && my >= by && my <= by + bh) {
      const label = buttons[r*3 + c];
      if (label === "←") keypad.entry = keypad.entry.slice(0, -1);
      else if (label === "✓") submitKeypad();
      else if (keypad.entry.length < 3) keypad.entry += label;
      return;
    }
  }
}

function submitKeypad() {
  if (keypad.entry === keypad.correctCode || keypad.entry === "π") {
    flags.drawerUnlocked = true;

    // Spawn key near drawer and auto-pick it up
    keyObj.exists = true;
    keyObj.x = drawerRect.x + drawerRect.w + 12;
    keyObj.y = drawerRect.y + drawerRect.h + 10;
    pickUp("key");
    ensureInventory("Brass Key");
    whispers.push({ text: "you found a brass key", x: drawerRect.x + 10, y: drawerRect.y - 10, a: 0, life: 255, drift: 0.2 });

    closeKeypad();
  } else {
    keypad.wrongFlash = 60;
    keypad.entry = "";
  }
}

function closeKeypad() { keypad.open = false; gameState = "awake"; }

/* ---------- Win / Lose Overlays ---------- */
function drawWinOverlay() {
  fill(0, 220); rect(0, 0, width, height);
  const pw = min(520, width * 0.9), ph = 220;
  const px = width/2 - pw/2, py = height/2 - ph/2;
  fill(20, 22, 30, 240); rect(px, py, pw, ph, 16);
  fill(255); textAlign(CENTER, TOP); textSize(22); text("You Escaped!", px + pw/2, py + 18);
  textSize(14); fill(220); textAlign(CENTER, TOP);
  text("The door opens to a soft turquoise dawn. You step out, lighter than smoke.", px + 24, py + 58, pw - 48, 80);
  const footer = "Press R to restart • Press P to view your album";
  fill(200); textSize(12); textAlign(CENTER, TOP);
  text(footer, px + 24, py + ph - 40, pw - 48, 30);
}

function drawLoseOverlay() {
  fill(0, 220); rect(0, 0, width, height);
  const pw = min(520, width * 0.9), ph = 220;
  const px = width/2 - pw/2, py = height/2 - ph/2;
  fill(20, 22, 30, 240); rect(px, py, pw, ph, 16);
  fill(255); textAlign(CENTER, TOP); textSize(22); text("Overwhelmed", px + pw/2, py + 18);
  textSize(14); fill(220); textAlign(CENTER, TOP);
  text("The waves crashed too hard this time. Breathe. You can try again.", px + 24, py + 58, pw - 48, 80);
  fill(200); textSize(12); textAlign(CENTER, TOP);
  text("Press R to restart", px + 24, py + ph - 40, pw - 48, 30);
}

/* ---------- Album Overlay ---------- */
function drawAlbumOverlay() {
  fill(0, 200); rect(0, 0, width, height);

  const pad = 24;
  const pw = min(width - pad*2, 860);
  const ph = min(height - pad*2, 560);
  const px = (width - pw) / 2;
  const py = (height - ph) / 2;

  fill(20, 22, 30, 240); rect(px, py, pw, ph, 16);
  fill(255); textAlign(LEFT, TOP); textSize(18);
  text(`Photo Album  ${camera.album.length}/${camera.maxShots}`, px + 16, py + 12);

  textSize(12); fill(220); text("Press P or Esc to close", px + 16, py + 36);

  const cols = 3, gap = 14;
  const thumbW = (pw - 32 - gap*(cols-1)) / cols;
  const thumbH = ph - 90; const ty = py + 62;

  albumUI.thumbBounds = [];
  for (let i = 0; i < camera.album.length; i++) {
    const img = camera.album[i];
    const tx = px + 16 + i * (thumbW + gap);
    fill(40, 44, 60); rect(tx, ty, thumbW, thumbH, 10);
    drawImageContain(img, tx + 8, ty + 8, thumbW - 16, thumbH - 16);
    albumUI.thumbBounds.push({ x: tx, y: ty, w: thumbW, h: thumbH, i });
  }

  if (camera.album.length === 0) {
    fill(200); textAlign(CENTER, CENTER); textSize(14);
    text("No photos yet — pick up the camera and click to snap.", px + pw/2, py + ph/2, pw - 60);
  }
}

function drawImageContain(img, x, y, w, h) {
  const iw = img.width, ih = img.height;
  const sc = min(w / iw, h / ih);
  const dw = iw * sc, dh = ih * sc;
  const dx = x + (w - dw) / 2, dy = y + (h - dh) / 2;
  image(img, dx, dy, dw, dh);
}

/* ---------- Reset Game ---------- */
function resetGame() {
  calmTask = null;
  rageChoice = { open: false, buttons: [] };
  rage = { intervalMs: 90000, nextAt: Infinity, locked: false, cigExhaleTicks: 0, furiousStartMs: 0, lastDamageMs: 0, damagePhaseStarted: false };
  preWave = { active: false, endsAt: 0, durationMs: 3000 };
  health = { lives: 3, maxLives: 3 };
  consumables = { matchaLeft: 2, cigHitsLeft: 2 };
  gameState = "sleep"; wakeFade = 0;
  afterImage = null; afterAlpha = 0; flashAlpha = 0;
  mood = "calm"; cigSmoke = []; cigEmitTimer = 0; breath = 0.0;

  flags = { photoRunes: false, drawerUnlocked: false, hasKey: false, doorOpened: false };
  inventory = [];
  camera = { maxShots: 3, shotsLeft: 3, album: [] };
  albumUI = { open: false, thumbBounds: [] };
  invTab = { open: false, anim: 0, tabHit: {x:0,y:0,w:0,h:0} };

  camObj.held = false; cigObj.held = false;
  keyObj = { exists: false, held: false, x: 0, y: 0 };
  doorAnim = { state: "closed", progress: 0, openedAt: 0 };

  layoutScene();
}

/* ---------- Mobile: prevent page scroll on finger drag ---------- */
function touchMoved() { return false; }
