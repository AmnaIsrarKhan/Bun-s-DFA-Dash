/* ============================================================
   game.js — Main Game Logic, Loop, UI, Power-ups
   ============================================================ */

// ── FRUIT DEFINITIONS ────────────────────────────────────────
const FRUITS = [
  { emoji: "🍒", color: "#E53935", effect: "life",   msg: "+1 Life! 🍒"      },
  { emoji: "🍋", color: "#FDD835", effect: "double", msg: "2x Score! 🍋"     },
  { emoji: "⭐", color: "#FFD700", effect: "star",   msg: "Invincible! ⭐"   },
  { emoji: "🍇", color: "#8E24AA", effect: "bonus",  msg: "+50 pts! 🍇"      },
  { emoji: "🍓", color: "#E91E63", effect: "bonus2", msg: "+30 pts! 🍓"      },
];

// ── OBSTACLE SPEED CONFIG ────────────────────────────────────
const OBS_SPD_BASE = 1.7;
const OBS_SPD_INC  = 0.28;

// ── GAME STATE ───────────────────────────────────────────────
let selLv = 0, curLv = 0;
let score = 0, lives = 3, combo = 0, jumpsCleared = 0, wrongCount = 0, maxCombo = 0;

let bunX = 72, bunY = GROUND, bunVY = 0, jumping = false;
let invincible = false, invTimer = 0;
let doubleScore = false, dsTimer = 0;

let obstacles = [], fruits = [];
let frame = 0, gameActive = false, animId = null;
let hitCooldown = 0, shakingBun = false, shakeT = 0;
let screenFlash = 0, screenFlashColor = "#F080C0";
let comboTimer = null, lvlUpTimer = null;
let rainbowMode = false, rainbowT = 0;

// Canvas
const C   = document.getElementById("gc");
const ctx = C.getContext("2d");
C.width   = 640;
C.height  = 185;

// ── HELPERS ──────────────────────────────────────────────────

function lv() { return LEVELS[curLv]; }

function show(id) {
  ["start-screen", "game-screen", "over-screen", "win-screen"]
    .forEach(s => document.getElementById(s).style.display = s === id ? "block" : "none");
}

function toggleHowTo() {
  const d = document.getElementById("howto");
  d.style.display = d.style.display === "none" ? "block" : "none";
}

function setVerdict(type, msg) {
  const v = document.getElementById("verdict");
  v.className = "verdict " + type;
  v.textContent = msg;
}

function doClear() {
  document.getElementById("str-in").value = "";
  setVerdict("idle", "Type a valid string and press Jump!");
}

function flashInput(ok) {
  const inp = document.getElementById("str-in");
  inp.classList.remove("flash-ok", "flash-bad");
  void inp.offsetWidth;                           // force reflow
  inp.classList.add(ok ? "flash-ok" : "flash-bad");
  setTimeout(() => inp.classList.remove("flash-ok", "flash-bad"), 420);
}

function triggerScreenFlash(color, intensity) {
  screenFlash      = intensity || 16;
  screenFlashColor = color || "#F080C0";
}

function setComboBanner(msg, color) {
  const b = document.getElementById("combo-banner");
  b.textContent  = msg;
  b.style.color  = color || "#B5006E";
  clearTimeout(comboTimer);
  comboTimer = setTimeout(() => { b.innerHTML = "&nbsp;"; }, 1500);
}

// ── UI BUILDERS ──────────────────────────────────────────────

function buildStartScreen() {
  const g = document.getElementById("lvl-grid");
  g.innerHTML = "";
  LEVELS.forEach((l, i) => {
    const d = document.createElement("div");
    d.className = "lvl-card" + (i === selLv ? " sel" : "");
    d.innerHTML = `<div class="lvl-card-name">${i + 1}. ${l.name}</div>
                   <div class="lvl-card-desc">${l.desc}</div>`;
    d.onclick = () => { selLv = i; buildStartScreen(); playTone(440, "sine", 0.09, 0.1); };
    g.appendChild(d);
  });
}

function renderNodes(active) {
  const d = document.getElementById("snodes");
  d.innerHTML = "";
  lv().states.forEach((s, i) => {
    if (i > 0) {
      const arr = document.createElement("span");
      arr.className   = "sarr";
      arr.textContent = "→";
      d.appendChild(arr);
    }
    const node = document.createElement("div");
    node.className =
      "snode" +
      (lv().accept.includes(s) ? " acc"  : "") +
      (s === "qd"               ? " dead" : "") +
      (s === active             ? " active" : "");
    node.textContent = s;
    d.appendChild(node);
  });
}

function renderExamples() {
  const d = document.getElementById("exrow");
  d.innerHTML = "";
  lv().yes.slice(0, 4).forEach(s => {
    const p = document.createElement("span");
    p.className   = "ex ok";
    p.textContent = s || "ε";
    p.onclick = () => {
      document.getElementById("str-in").value = s;
      playTone(440, "sine", 0.07, 0.08);
    };
    d.appendChild(p);
  });
  lv().no.slice(0, 4).forEach(s => {
    const p = document.createElement("span");
    p.className   = "ex no";
    p.textContent = s || "ε";
    d.appendChild(p);
  });
}

function updateHUD() {
  document.getElementById("score-pill").textContent = "score: " + score;
  document.getElementById("lvl-pill").textContent   = "level " + (curLv + 1) + "/4";
  document.getElementById("lives-pill").textContent =
    "♥".repeat(lives) + "♡".repeat(Math.max(0, 3 - lives));

  const cp = document.getElementById("combo-pill");
  if (combo >= 2) {
    cp.style.display = "inline-block";
    cp.textContent   = "🔥x" + combo;
    cp.classList.add("pop");
    setTimeout(() => cp.classList.remove("pop"), 300);
  } else {
    cp.style.display = "none";
  }

  const pp = document.getElementById("power-pill");
  if      (invincible)  { pp.style.display = "inline-block"; pp.textContent = "⭐ invincible!"; }
  else if (doubleScore) { pp.style.display = "inline-block"; pp.textContent = "🍋 2x score!";   }
  else                  { pp.style.display = "none"; }

  document.getElementById("prog").style.width =
    Math.round((jumpsCleared / 5) * 100) + "%";
}

function loadChallenge() {
  document.getElementById("ch-txt").textContent  = lv().desc;
  document.getElementById("ch-hint").textContent = lv().hint;
}

// ── GAME LIFECYCLE ───────────────────────────────────────────

function startGame() {
  curLv = selLv; score = 0; lives = 3; combo = 0;
  jumpsCleared = 0; wrongCount = 0; maxCombo = 0;
  bunX = 72; bunY = GROUND; bunVY = 0; jumping = false;
  invincible = false; invTimer = 0; doubleScore = false; dsTimer = 0;
  obstacles = []; fruits = []; particles = [];
  frame = 0; gameActive = true; hitCooldown = 0;
  shakingBun = false; screenFlash = 0;
  rainbowMode = false; rainbowT = 0;

  show("game-screen");
  updateHUD();
  renderNodes(lv().start);
  renderExamples();
  loadChallenge();
  spawnObstacle(true);

  if (animId) cancelAnimationFrame(animId);
  gameLoop();

  playTone(300, "sine", 0.1, 0.1);
  playTone(400, "sine", 0.1, 0.1, 0.1);
}

function restartGame() { startGame(); }

function goHome() {
  gameActive = false;
  if (animId) cancelAnimationFrame(animId);
  buildStartScreen();
  show("start-screen");
}

function showOver() {
  document.getElementById("over-msg").innerHTML =
    `You ran out of lives!<br>Final score: <b>${score}</b>`;
  document.getElementById("over-stats").innerHTML =
    `<b>Level reached:</b> ${curLv + 1}/4<br>` +
    `<b>DFA:</b> ${lv().name}<br>` +
    `<b>Max combo:</b> x${maxCombo}<br>` +
    `<b>Wrong answers:</b> ${wrongCount}<br>` +
    `<b>Final score:</b> ${score}`;
  show("over-screen");
}

function showWin() {
  document.getElementById("win-msg").innerHTML =
    `You mastered all 4 DFAs!<br>Final score: <b>${score}</b>`;
  document.getElementById("win-stats").innerHTML =
    `<b>All levels cleared!</b> 🌟<br>` +
    `<b>Max combo:</b> x${maxCombo}<br>` +
    `<b>Wrong answers:</b> ${wrongCount}<br>` +
    `<b>Final score:</b> ${score}`;
  show("win-screen");
}

// ── JUMP ACTION ──────────────────────────────────────────────

function doJump() {
  if (!gameActive) return;
  const str = document.getElementById("str-in").value;
  const res = runDFA(str, curLv);           // call DFA engine

  if (!res.ok) {
    setVerdict("fail", "Rejected: " + res.msg);
    flashInput(false);
    sndFail();
    triggerScreenFlash("#FF8888", 10);
    wrongCount++; combo = 0; updateHUD();
    shakingBun = true; shakeT = 0;
    loseLife();
    spawnPopup("✗ Rejected!", "#E65100", 100, 80);
    return;
  }

  // Accepted!
  combo++; if (combo > maxCombo) maxCombo = combo; jumpsCleared++;
  const mult  = doubleScore ? 2 : 1;
  const bonus = combo >= 3 ? combo * 15 : 0;
  const pts   = (10 + bonus) * mult;
  score += pts;
  flashInput(true);

  const px = bunX, py = bunY - 22;

  if (combo >= 5) {
    sndCombo();
    triggerScreenFlash("#FFD6EE", 18);
    rainbowMode = true; rainbowT = 120;
    burstParticles(px, py, 35,
      ["#F080C0","#FFD700","#A0F0C0","#80C0FF","#FF8080","#E080FF"],
      ["circle", "star"]);
    setComboBanner(`🌈 MEGA COMBO x${combo}!! +${pts} pts`, "#B5006E");
    spawnPopup(`MEGA x${combo}! 🌈`, "#B5006E", px, py - 18);
  } else if (combo >= 3) {
    sndCombo();
    triggerScreenFlash("#FFE0FA", 13);
    burstParticles(px, py, 20, ["#F080C0","#FFD080","#A0E8FF","#A0F0A0"]);
    setComboBanner(`🔥 Combo x${combo}! +${pts} pts`, "#D060A0");
    spawnPopup(`COMBO x${combo}! 🔥`, "#880050", px, py - 10);
  } else {
    sndOk();
    burstParticles(px, py, 10, ["#F4B8DC","#FFD6EE","#C8F0D8","#C8D8FF"]);
    setComboBanner(`Accepted at ${res.state} ✓ +${pts}`, "#2E7D32");
    spawnPopup(`+${pts}`, "#2E7D32", px + 28, py);
  }

  setVerdict("ok", `Accepted at state ${res.state} — Bun jumps! 🐰`);
  updateHUD();
  document.getElementById("str-in").value = "";

  // Level progression: 5 correct jumps = next level
  if (jumpsCleared >= 5) {
    if (curLv < LEVELS.length - 1) {
      jumpsCleared = 0;
      const overlay = document.getElementById("lvlup-overlay");
      document.getElementById("lvlup-txt").textContent =
        `Level ${curLv + 2}! 🎉 Now: ${LEVELS[curLv + 1].name}`;
      overlay.style.display = "flex";
      sndLevelUp();
      triggerScreenFlash("#FFD6EE", 24);
      burstParticles(320, 90, 50, ["#F080C0","#FFD700","#80F0C0","#80C0FF","#FF80A0"]);
      clearTimeout(lvlUpTimer);
      lvlUpTimer = setTimeout(() => {
        overlay.style.display = "none";
        curLv++;
        renderNodes(lv().start);
        renderExamples();
        loadChallenge();
        updateHUD();
      }, 1900);
    } else {
      // Win!
      gameActive = false;
      sndWin();
      burstParticles(320, 90, 70, ["#F080C0","#FFD700","#80F0C0","#80C0FF","#FF80C0"]);
      setTimeout(showWin, 1100);
      return;
    }
  }

  physJump();
}

function physJump() {
  if (jumping) return;
  jumping = true;
  bunVY   = -13.5;
  sndJump();
}

function loseLife() {
  if (invincible) return;
  lives = Math.max(0, lives - 1);
  updateHUD();
  const pill = document.getElementById("lives-pill");
  pill.classList.add("pop");
  setTimeout(() => pill.classList.remove("pop"), 300);
  if (lives === 0) { gameActive = false; setTimeout(showOver, 750); }
}

// ── OBSTACLES ────────────────────────────────────────────────

function spawnObstacle(first) {
  const h   = 20 + Math.floor(Math.random() * 30);
  const spd = OBS_SPD_BASE + curLv * OBS_SPD_INC;
  const colors = ["#F080C0","#A0C8FF","#A8F0C0","#FFD080","#C8A0F0"];
  obstacles.push({
    x:     first ? 690 : 690 + Math.random() * 180,
    w:     26,
    h,
    spd,
    color: colors[Math.floor(Math.random() * colors.length)]
  });
}

// ── FRUITS ───────────────────────────────────────────────────

function trySpawnFruit() {
  if (Math.random() < 0.018 && fruits.length < 3) {
    const f = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    fruits.push({
      x:         700 + Math.random() * 200,
      y:         GROUND - 40 - Math.random() * 55,
      spd:       1.5 + curLv * 0.2,
      emoji:     f.emoji,
      effect:    f.effect,
      msg:       f.msg,
      color:     f.color,
      bob:       Math.random() * Math.PI * 2,
      collected: false
    });
  }
}

function applyFruit(f) {
  sndFruit();
  burstParticles(f.x, f.y, 22, ["#FFD700","#FFF0A0","#FFFFFF", f.color]);
  spawnPopup(f.msg, f.color, f.x, f.y - 20);

  switch (f.effect) {
    case "life":   lives = Math.min(5, lives + 1); updateHUD(); break;
    case "double": doubleScore = true; dsTimer = 300; updateHUD(); break;
    case "star":
      invincible = true; invTimer = 280;
      sndStar();
      triggerScreenFlash("#FFD700", 20);
      burstParticles(bunX, bunY - 20, 40, ["#FFD700","#FFF0A0","#F080C0"]);
      updateHUD();
      break;
    case "bonus":  score += 50; updateHUD(); break;
    case "bonus2": score += 30; updateHUD(); break;
  }
}

// ── COLLISION DETECTION ──────────────────────────────────────

function collidesWithObstacle(ob) {
  const bL = bunX - 12, bR = bunX + 12;
  const bT = bunY - 24, bB = bunY;
  return bR > ob.x + 4 && bL < ob.x + ob.w - 4 &&
         bB > GROUND - ob.h + 5 && bT < GROUND;
}

function collidesWithFruit(f) {
  const dx = bunX - f.x;
  const dy = (bunY - 12) - (f.y - 8);
  return Math.sqrt(dx * dx + dy * dy) < 28;
}

// ── MAIN GAME LOOP ───────────────────────────────────────────

function gameLoop() {
  if (!gameActive) return;
  animId = requestAnimationFrame(gameLoop);
  frame++;

  // Timers
  if (shakingBun)  { shakeT++;  if (shakeT  > 20)  { shakingBun = false; shakeT = 0; } }
  if (hitCooldown > 0) hitCooldown--;
  if (invincible)  { invTimer--;  if (invTimer  <= 0) { invincible  = false; updateHUD(); } }
  if (doubleScore) { dsTimer--;   if (dsTimer   <= 0) { doubleScore = false; updateHUD(); } }
  if (rainbowMode) { rainbowT--;  if (rainbowT  <= 0)   rainbowMode = false; }

  // ── Screen flash overlay (drawn before scene) ──
  if (screenFlash > 0) {
    ctx.fillStyle   = screenFlashColor;
    ctx.globalAlpha = screenFlash / 30;
    ctx.fillRect(0, 0, 640, 185);
    ctx.globalAlpha = 1;
    screenFlash--;
  }

  // ── Draw background ──
  drawScene(ctx, frame, rainbowMode, rainbowT, bunX, bunY, invincible);

  // ── Obstacles ──
  obstacles.forEach(ob => { ob.x -= ob.spd; drawObstacle(ctx, ob); });
  obstacles = obstacles.filter(ob => ob.x > -55);
  const lastOx = obstacles.length ? obstacles[obstacles.length - 1].x : -999;
  if (obstacles.length === 0 || (obstacles.length < 2 && lastOx < 480)) {
    spawnObstacle(false);
  }

  // ── Fruits ──
  trySpawnFruit();
  fruits.forEach(f => { f.x -= f.spd; drawFruit(ctx, f); });
  fruits.forEach(f => {
    if (!f.collected && collidesWithFruit(f)) {
      f.collected = true;
      applyFruit(f);
    }
  });
  fruits = fruits.filter(f => !f.collected && f.x > -30);

  // ── Jump physics ──
  if (jumping) {
    bunVY += 0.64;
    bunY  += bunVY;
    if (bunY >= GROUND) { bunY = GROUND; bunVY = 0; jumping = false; }
  }

  // ── Obstacle collision ──
  if (!invincible && hitCooldown === 0) {
    if (obstacles.some(ob => collidesWithObstacle(ob))) {
      hitCooldown = 80;
      sndHit();
      triggerScreenFlash("#FF6666", 18);
      burstParticles(bunX, bunY - 10, 22, ["#FF8080","#FFB0B0","#FFD0D0"]);
      setVerdict("fail", "Ouch! Bun got hit! 💥");
      combo = 0; updateHUD();
      shakingBun = true; shakeT = 0;
      loseLife();
      obstacles = [];
      spawnPopup("OUCH! 💥", "#E65100", bunX, bunY - 30);
    }
  }

  // ── Draw Bun ──
  drawBun(ctx, bunX, bunY, frame, jumping, shakingBun, shakeT, invincible, doubleScore);

  // ── Draw particles ──
  updateAndDrawParticles(ctx, rainbowMode, frame);

  // ── Update DFA state display ──
  renderNodes(lv().start);
}

// ── KEYBOARD INPUT ───────────────────────────────────────────
document.getElementById("str-in").addEventListener("keydown", e => {
  if (e.key === "Enter") doJump();
});

// ── INIT ─────────────────────────────────────────────────────
buildStartScreen();
show("start-screen");
