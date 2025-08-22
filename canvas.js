const c = document.getElementById("myCanvas");
const ctx = c.getContext("2d");

function resize() {
  c.width = window.innerWidth;
  c.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

const particles = Array.from({ length: 80 }, () => ({
  x: Math.random() * c.width,
  y: Math.random() * c.height,
  r: Math.random() * 2 + 1,
  dx: (Math.random() - 0.5) * 0.5,
  dy: (Math.random() - 0.5) * 0.5,
}));

let running = false;
let alpha = 0;

function draw() {
  if (!running) {
    requestAnimationFrame(draw);
    return;
  }

  ctx.fillStyle = `rgba(15,18,32,${Math.min(alpha, 0.35)})`;
  ctx.fillRect(0, 0, c.width, c.height);

  particles.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(122,162,255,${alpha})`;
    ctx.fill();

    p.x += p.dx;
    p.y += p.dy;

    if (p.x < 0 || p.x > c.width) p.dx *= -1;
    if (p.y < 0 || p.y > c.height) p.dy *= -1;
  });

  if (alpha < 0.7) alpha += 0.01;

  requestAnimationFrame(draw);
}

draw();

window.startCanvas = function () {
  running = true;
  alpha = 0;
};
