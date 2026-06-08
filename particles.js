/* ============================================================
   particles.js — Particle & Popup Effects
   ============================================================ */

let particles = [];

/**
 * burstParticles(x, y, count, colors, shapes)
 * Spawns a burst of particles at canvas position (x, y)
 * shapes: array of "circle" | "star"
 */
function burstParticles(x, y, count, colors, shapes) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 5;
    particles.push({
      x,
      y,
      vx:    Math.cos(angle) * speed,
      vy:    Math.sin(angle) * speed - 2.5,
      life:  1.0,
      r:     2 + Math.random() * 5,
      color: colors[i % colors.length],
      shape: shapes ? shapes[i % shapes.length] : "circle"
    });
  }
}

/**
 * updateAndDrawParticles(ctx, rainbowMode, frame)
 * Call once per frame inside the game loop
 */
function updateAndDrawParticles(ctx, rainbowMode, frame) {
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.fillStyle   = rainbowMode ? rainbowColor(p.x + frame) : p.color;

    if (p.shape === "star") {
      ctx.translate(p.x, p.y);
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = i * Math.PI * 2 / 5 - Math.PI / 2;
        const b = a + Math.PI / 5;
        ctx.lineTo(Math.cos(a) * p.r,        Math.sin(a) * p.r);
        ctx.lineTo(Math.cos(b) * p.r * 0.45, Math.sin(b) * p.r * 0.45);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Physics update
    p.x    += p.vx;
    p.y    += p.vy;
    p.vy   += 0.24;   // gravity
    p.life -= 0.026;
  });

  // Remove dead particles
  particles = particles.filter(p => p.life > 0);
}

/**
 * spawnPopup(msg, color, x, y)
 * Creates a floating text popup anchored to the canvas position
 */
function spawnPopup(msg, color, x, y) {
  const el    = document.createElement("div");
  el.className    = "popup";
  el.textContent  = msg;
  el.style.color  = color || "#B5006E";

  const canvas = document.getElementById("gc");
  el.style.left = Math.min(Math.max(x, 10), 580) + "px";
  el.style.top  = (canvas.offsetTop + Math.max(y, 10)) + "px";

  document.getElementById("app").appendChild(el);
  setTimeout(() => el.remove(), 1050);
}
