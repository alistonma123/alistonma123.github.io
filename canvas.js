// Lightweight background animation that only starts after the intro
(() => {
  const canvas = document.getElementById("myCanvas");
  const ctx = canvas.getContext("2d", { alpha: true });

  let rafId = null;
  let t = 0;
  let started = false;

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.floor(window.innerWidth));
    const h = Math.max(1, Math.floor(window.innerHeight));
    canvas.width = Math.floor(w * ratio);
    canvas.height = Math.floor(h * ratio);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function draw() {
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);

    // Subtle animated gradient
    const g = ctx.createLinearGradient(0, 0, w, h);
    const a = 0.25 + 0.25 * Math.sin(t * 0.0015);
    const b = 0.25 + 0.25 * Math.cos(t * 0.0013);
    g.addColorStop(0, `rgba(20,24,44,0.9)`);
    g.addColorStop(1, `rgba(${20 + Math.floor(20*a)}, ${30 + Math.floor(40*b)}, 80, 0.85)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Soft moving dots
    const dots = 40;
    for (let k = 0; k < dots; k++) {
      const x = (w / dots) * k + 30 * Math.sin((t + k * 200) * 0.0012);
      const y = h * (0.3 + 0.2 * Math.sin((t + k * 90) * 0.0011 + k));
      const r = 0.8 + 1.2 * (0.5 + 0.5 * Math.sin((t + k * 50) * 0.002));
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(122,162,255,0.08)";
      ctx.fill();
    }

    t += 16;
    rafId = requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);

  // Expose a start function the intro calls after fade-out
  window.startCanvas = function startCanvas() {
    if (started) return;
    started = true;
    resize();
    draw();
  };
})();
