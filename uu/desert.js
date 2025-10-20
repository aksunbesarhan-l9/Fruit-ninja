const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const sliceSound = document.getElementById('sliceSound');
const bgImage = document.getElementById('bgImage');
const gameOverSound = document.getElementById('gameOverSound');

let W, H;
function resize(){
  const ratio = devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight - document.querySelector('header').offsetHeight - document.querySelector('.footer').offsetHeight;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  canvas.width = Math.floor(W * ratio);
  canvas.height = Math.floor(H * ratio);
  ctx.setTransform(ratio,0,0,ratio,0,0);
}
window.addEventListener('resize', resize);

let fruits = [];
let particles = [];
let slices = [];
let lastSpawn = 0;
let spawnInterval = 800;
let gravity = 0.18;
let running = false;
let score = 0;
let misses = 0;
let maxMiss = 3;
let lastTime = 0;
let combo = 0;

/* 📱 Егер телефон болса — жеміс өлшемі кішірейеді */
const isMobile = /Mobi|Android/i.test(navigator.userAgent);
const FRUIT_SCALE = isMobile ? 0.6 : 1; 

const FRUIT_TYPES = [
  {char: '🧁', radius: 80 * FRUIT_SCALE, points: 10},
  {char: '🍰', radius: 80 * FRUIT_SCALE, points: 12},
  {char: '🍩', radius: 80 * FRUIT_SCALE, points: 9},
  {char: '🥐', radius: 80 * FRUIT_SCALE, points: 10},
];

function rand(min,max){return Math.random()*(max-min)+min}

function spawn(isBomb=false, extra=false){
  const x = rand(80, W-80);
  const y = H - 90;
  const angle = rand(-Math.PI*0.9, -Math.PI*0.4);
  const speed = rand(8, 13) * (extra?1.5:1);
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;
  if(isBomb){
    fruits.push({type: 'bomb', x,y,vx,vy,r:50*FRUIT_SCALE,rot:rand(-0.1,0.1)});
  } else {
    const t = FRUIT_TYPES[Math.floor(rand(0,FRUIT_TYPES.length))];
    fruits.push({type:'fruit', kind:t, x,y,vx,vy,r:t.radius,rot:rand(-0.1,0.1),points:t.points});
  }
}

function startGame(){
  fruits = []; particles = []; slices = [];
  score=0; misses=0; combo=0;
  running=true; lastSpawn=0; spawnInterval=800; lastTime=0;
}

function endGame(){ 
  running=false;
  gameOverSound.currentTime = 0; 
  gameOverSound.play();  
}

let isDown = false;
let pointerId = null;
function addSlice(x,y){
  slices.push({x,y,t:Date.now()});
  if(slices.length>20) slices.shift();
}
canvas.addEventListener('pointerdown', (e)=>{ 
  canvas.setPointerCapture(e.pointerId); 
  isDown=true; pointerId=e.pointerId; 
  addSlice(e.offsetX,e.offsetY); 
});
canvas.addEventListener('pointermove', (e)=>{ 
  if(isDown && e.pointerId===pointerId){ addSlice(e.offsetX,e.offsetY); } 
});
canvas.addEventListener('pointerup', (e)=>{ 
  canvas.releasePointerCapture(e.pointerId); 
  isDown=false; pointerId=null; slices=[]; combo=0; 
});

function lineCircleIntersect(x1,y1,x2,y2,cx,cy,r){
  const A = x2-x1, B=y2-y1;
  const t = ((cx-x1)*A + (cy-y1)*B) / (A*A + B*B);
  const tt = Math.max(0, Math.min(1, t));
  const dx = x1 + A*tt - cx;
  const dy = y1 + B*tt - cy;
  return (dx*dx + dy*dy) <= r*r;
}

function sliceCheck(){
  if(slices.length<2) return;
  for(let i=0;i<fruits.length;i++){
    const f = fruits[i];
    if(f.dead) continue;
    for(let s=0;s<slices.length-1;s++){
      const a = slices[s]; const b = slices[s+1];
      if(lineCircleIntersect(a.x,a.y,b.x,b.y,f.x,f.y,f.r)){
        if(f.type==='bomb'){
          createExplosion(f.x,f.y,true);
          f.dead=true; endGame();
          return;
        } else {
          f.dead=true;
          score += f.points * (1 + Math.floor(combo/3));
          combo++;
          sliceSound.currentTime = 0;
          sliceSound.play();
          createJuice(f);
          splitFruit(f);
        }
        break;
      }
    }
  }
}

function splitFruit(fruit){
  for(let i=0;i<2;i++){
    fruits.push({
      type:'piece',
      kind:fruit.kind,
      x:fruit.x + (i===0?-15:15),
      y:fruit.y,
      vx:fruit.vx + (i===0?-3:3),
      vy:fruit.vy - 2,
      r:fruit.r*0.5,
      rot:fruit.rot,
      points:0,
      dead:false
    });
  }
}

function createExplosion(x,y){ 
  for(let i=0;i<40;i++) particles.push({x,y,vx:rand(-6,6),vy:rand(-6,6),life:rand(600,1200),t:Date.now(),r:rand(2,4)});
}
function createJuice(f){ 
  for(let i=0;i<20;i++) particles.push({x:f.x,y:f.y+rand(-8,8),vx:rand(-4,4),vy:rand(-6,2),life:rand(400,900),t:Date.now(),r:rand(2,5)});
}

function update(dt){
  if(!running) return;
  lastSpawn += dt;
  if(lastSpawn > spawnInterval){
    lastSpawn = 0;
    const isBomb = Math.random() < 0.12;
    const extra = Math.random() < 0.15;
    spawn(isBomb, extra);
    spawnInterval = Math.max(350, spawnInterval * 0.995);
  }
  for(let i=fruits.length-1;i>=0;i--){
    const f = fruits[i];
    if (f.dead) { fruits.splice(i, 1); continue; }
    f.vy += gravity * dt/16.6;
    f.x += f.vx * dt/16.6;
    f.y += f.vy * dt/16.6;
    f.vx *= 0.999;
    f.rot += 0.01 * (f.vx>0?1:-1);
    if(f.y - f.r > H + 60){
      if(!f.dead && f.type==='fruit'){
        misses++;
        combo = 0;
        if(misses >= maxMiss) endGame();
      }
      fruits.splice(i,1);
    }
  }
  for(let i=particles.length-1;i>=0;i--){
    const p = particles[i];
    const age = Date.now() - p.t;
    if(age > p.life){ particles.splice(i,1); continue; }
    p.vy += gravity*0.04;
    p.x += p.vx * dt/16.6;
    p.y += p.vy * dt/16.6;
  }
  sliceCheck();
}

function draw(){
  ctx.drawImage(bgImage, 0, 0, W, H);
  if (!running && score === 0 && misses === 0) {
    ctx.fillStyle='rgba(0,0,0,0.45)';
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle='white';
    ctx.textAlign='center';
    const titleSize = Math.max(18, W * 0.04); 
    const subSize = Math.max(12, W * 0.03);
    ctx.font='28px sans-serif';
    ctx.fillText('Fruit Ninja🍉', W/2, H/2 - 20);
    ctx.font='18px sans-serif';
    ctx.fillText('Ойынды бастау үшін "Бастау" батырмасын басыңыз', W/2, H/2 + 10);
    return;
      if(!running){
    ctx.fillStyle='rgba(0,0,0,0.45)';
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle='white';
    ctx.textAlign='center';

    // 📱 Адаптив мәтін өлшемі
    const endTitle = Math.max(18, W * 0.05);
    const endSub = Math.max(14, W * 0.035);
    const endSmall = Math.max(10, W * 0.025);

    ctx.font=`${endTitle}px sans-serif`;
    ctx.fillText('Ойын аяқталды', W/2, H/2 - 30);
    ctx.font=`${endSub}px sans-serif`;
    ctx.fillText('Ұпай: '+score, W/2, H/2);
    ctx.font=`${endSmall}px sans-serif`;
    ctx.fillText('"Бастау" батырмасын басып қайта ойнаңыз', W/2, H/2 + 28);
  }
}

  for(const f of fruits){
    ctx.save();
    ctx.translate(f.x,f.y);
    ctx.rotate(f.rot || 0);
    if(f.type==='bomb'){
      ctx.beginPath(); ctx.fillStyle='#111'; ctx.arc(0,0,f.r,0,Math.PI*2); ctx.fill();
      ctx.lineWidth=3; ctx.strokeStyle='#555'; ctx.stroke();
      ctx.fillStyle='#fff'; ctx.font=(f.r*1.05)+'px serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('💣',0,0);
    } else {
      ctx.font=(f.r*2)+'px serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(f.kind.char,0,0);
    }
    ctx.restore();
  }

  for(const p of particles){
    const life = 1 - ((Date.now()-p.t)/p.life);
    ctx.globalAlpha = Math.max(0, life);
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.fill();
  }
  ctx.globalAlpha =1;

  if(slices.length>1){
    ctx.lineCap='round'; ctx.lineJoin='round';
    for(let i=0;i<slices.length-1;i++){
      const a = slices[i], b=slices[i+1];
      const alpha = (i+1)/slices.length;
      ctx.strokeStyle = `rgba(255,255,255,${0.95*alpha})`;
      ctx.lineWidth = 6 * (0.6 + alpha);
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    }
  }

  ctx.textAlign='left';
  ctx.fillStyle='rgba(255,255,255,0.06)';
  ctx.fillRect(10,10,160,46);
  ctx.fillStyle='#fff';
  ctx.font='16px sans-serif';
  ctx.fillText('Score: '+score,20,32);
  ctx.fillText('Misses: '+misses+'/'+maxMiss,20,52);

  if(!running){
    ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='white'; ctx.textAlign='center'; ctx.font='32px sans-serif';
    ctx.fillText('Ойын аяқталды', W/2, H/2 - 30);
    ctx.font='18px sans-serif'; ctx.fillText('Ұпай: '+score, W/2, H/2);
    ctx.font='14px sans-serif'; ctx.fillText('"Бастау" батырмасын басып қайта ойнаңыз', W/2, H/2 + 28);
  }
}

function loop(ts){
  if(!lastTime) lastTime = ts;
  const dt = Math.min(40, ts - lastTime);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

document.getElementById('startBtn').addEventListener('click', ()=>{ startGame(); });
document.getElementById('pauseBtn').addEventListener('click', (e)=>{
  running = !running;
  e.target.textContent = running ? 'Пауза' : 'Қайта жалғастыру';
});

function init(){ resize(); requestAnimationFrame(loop); }
init();