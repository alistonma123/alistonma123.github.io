const c=document.getElementById("myCanvas");
const ctx=c.getContext("2d");

function resize(){c.width=window.innerWidth;c.height=window.innerHeight}
window.addEventListener("resize",resize);
resize();

const COUNT=12;
const particles=Array.from({length:COUNT},()=>({
  x:Math.random()*c.width,
  y:Math.random()*c.height,
  r:Math.random()*1.2+0.8,
  dx:(Math.random()-0.5)*0.15,
  dy:(Math.random()-0.5)*0.15
}));

let running=false;
let alpha=0;
let last=0;
const interval=1000/24;

function step(t){
  if(!running){requestAnimationFrame(step);return}
  if(t-last<interval){requestAnimationFrame(step);return}
  last=t;

  ctx.clearRect(0,0,c.width,c.height);
  ctx.fillStyle=`rgba(15,18,32,${Math.min(alpha,0.18)})`;
  ctx.fillRect(0,0,c.width,c.height);

  for(const p of particles){
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle=`rgba(122,162,255,${alpha*0.55})`;
    ctx.fill();
    p.x+=p.dx;p.y+=p.dy;
    if(p.x<0||p.x>c.width)p.dx*=-1;
    if(p.y<0||p.y>c.height)p.dy*=-1;
  }

  if(alpha<0.45)alpha+=0.006;
  requestAnimationFrame(step);
}

requestAnimationFrame(step);

window.startCanvas=function(){
  running=true;
  alpha=0;
};
