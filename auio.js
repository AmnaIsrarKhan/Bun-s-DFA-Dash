/* ============================================================
   audio.js — Sound Effects via Web Audio API
   No external files — all tones are synthesised on the fly
   ============================================================ */

let audioCtx = null;

function getAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn("Web Audio API not supported");
    }
  }
  return audioCtx;
}

/**
 * playTone(frequency, waveType, duration, volume, startDelay)
 */
function playTone(freq, type = "sine", dur = 0.15, vol = 0.12, delay = 0) {
  const a = getAudio();
  if (!a) return;
  try {
    const osc  = a.createOscillator();
    const gain = a.createGain();
    osc.connect(gain);
    gain.connect(a.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, a.currentTime + delay);
    gain.gain.setValueAtTime(vol, a.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + delay + dur);
    osc.start(a.currentTime + delay);
    osc.stop(a.currentTime + delay + dur);
  } catch (e) {}
}

// ── Named sound effects ──────────────────────────────────────

function sndJump() {
  playTone(380, "sine", 0.07, 0.14);
  playTone(560, "sine", 0.07, 0.11, 0.05);
}

function sndOk() {
  [480, 620, 780].forEach((f, i) => playTone(f, "sine", 0.09, 0.12, i * 0.055));
}

function sndCombo() {
  [580, 720, 880, 1060].forEach((f, i) => playTone(f, "triangle", 0.1, 0.14, i * 0.05));
}

function sndFail() {
  playTone(280, "sawtooth", 0.14, 0.12);
  playTone(200, "sawtooth", 0.18, 0.10, 0.1);
}

function sndLevelUp() {
  [380, 480, 580, 760, 960].forEach((f, i) => playTone(f, "sine", 0.14, 0.16, i * 0.065));
}

function sndWin() {
  [520, 656, 780, 1044].forEach((f, i) => playTone(f, "sine", 0.2, 0.18, i * 0.09));
}

function sndHit() {
  playTone(140, "square", 0.22, 0.16);
}

function sndFruit() {
  playTone(660, "sine", 0.12, 0.18);
  playTone(880, "sine", 0.10, 0.15, 0.08);
}

function sndStar() {
  [440, 550, 660, 880].forEach((f, i) => playTone(f, "triangle", 0.1, 0.16, i * 0.04));
}
