document.addEventListener("DOMContentLoaded", () => {
    let fakePercent = 0;
    const fill = document.getElementById("loadFill");
    const percentTxt = document.getElementById("loadPercent");

    // Fake loading progress until real load
    const fake = setInterval(() => {
        fakePercent += Math.random() * 7;
        if (fakePercent > 90) fakePercent = 90;

        fill.style.width = fakePercent + "%";
        percentTxt.textContent = Math.round(fakePercent) + "%";
    }, 200);

    // Real loading when whole page finishes
    window.addEventListener("load", () => {
        clearInterval(fake);

        fill.style.width = "100%";
        percentTxt.textContent = "100%";

        setTimeout(() => {
            const loader = document.getElementById("loader");
            loader.style.opacity = "0";

            setTimeout(() => {
                loader.style.display = "none";
            }, 700);
        }, 300);
    });
});


(() => {
if (!window.Android) {

    const loginStatus = localStorage.getItem("login");

    // If no login → send back to index.html
    if (loginStatus !== "true") {
        window.location.href = "index.html";
    }
}
// Web vs App UI control
window.addEventListener("load", () => {

    // If running inside HTML2APK → window.Android exists
    const isApp = !!window.Android;

    // Header visibility
    document.getElementById("topHeader").style.display = isApp ? "flex" : "none";

    // Fullscreen button visibility
    document.getElementById("fsBtn").style.display = isApp ? "none" : "flex";
});
  // Elements
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const overlay = document.getElementById('overlayMsg');
  const restartBtn = document.getElementById('restartBtn');
  const exitBtn = document.getElementById('exitBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const pauseMenu = document.getElementById('pauseMenu');
  const resumeBtn = document.getElementById('resumeGame');
  const restartGameBtn = document.getElementById('restartGame');
  const exitGameBtn = document.getElementById('exitGame');
  const bossHpBar = document.getElementById('bossHp');
  const bossHpInner = document.getElementById('bossHpInner');
  const blastOverlay = document.getElementById('blastOverlay');

/* ------------------ AUDIO SETUP (9 Audios) ------------------ */

// AUDIO 1 → Background music (always plays during gameplay)
// Stops ONLY using rapidFadeOut() when:
// - Boss wins
// - Character wins (before blast)
// - During blast scene
// - During final message
// - Restart/Exit resets it fresh
const audio1 = new Audio("audio1.mp3");
audio1.loop = true;
audio1.volume =  0.05; // normal gameplay volume


// Jump
const audio2 = new Audio("audio2.wav");

// Hit obstacle
const audio3 = new Audio("audio3.wav");

// Boss warning (fade in)
const audio4 = new Audio("audio4.mp3");
audio4.loop = false;
audio4.volume = 1;

// Boss fight theme
const audio5 = new Audio("audio5.mp3");
audio5.loop = true;

// Boss wins
const audio6 = new Audio("audio6.mp3");

// Character wins (victory sting)
const audio7 = new Audio("audio7.mp3");

// Blast ambience loop
const audio8 = new Audio("audio8.mp3");
audio8.loop = true;

// Calm post-blast music
const audio9 = new Audio("audio9.mp3");
audio9.loop = true;



/* ------------------ AUDIO HELPERS ------------------ */

// Safe play: prevents Chrome/Android auto-play errors
function safePlay(a){
    const p = a.play();
    if (p && p.catch) p.catch(()=>{});
}

// Smooth fade to a target volume (for boss warning/fight)
function smoothVolume(audio, target, speed = 0.03) {
    clearInterval(audio._fade);

    audio._fade = setInterval(() => {

        // Adjust volume
        if (Math.abs(audio.volume - target) < 0.03) {
            audio.volume = target;
            clearInterval(audio._fade);
        } 
        else if (audio.volume < target) {
            audio.volume += speed;
        } 
        else {
            audio.volume -= speed;
        }

        // ✅ Prevent volume going outside 0–1
        audio.volume = Math.min(1, Math.max(0, audio.volume));

    }, 60);
}

// SUPER FAST fade-out and stop (used for win/loss/blast)
function rapidFadeOut(audio){
    clearInterval(audio._fade);
    audio._fade = setInterval(() => {
        audio.volume = Math.max(0, audio.volume - 0.15);  // ← FIXED HERE

        if(audio.volume <= 0){
            audio.volume = 0;
            audio.pause();
            clearInterval(audio._fade);
        }
    }, 50);
}


/* ------------------ STOP ALL AUDIO (EXCEPT audio1) ------------------ */

// NOTICE: audio1 NEVER stops here.
// It only stops through rapidFadeOut().
function stopAllAudio(){
    [audio1, audio2,audio3,audio4,audio5,audio6,audio7,audio8,audio9].forEach(a=>{
        try {
            a.pause();
            a.currentTime = 0;
        } catch(e){}
    });
}



/* ------------------ EXACT TIMELINE HOOKS (Use these in your code) ------------------ */

// 1. START GAMEPLAY → play background at full volume
function AUDIO_START_GAMEPLAY(){
    audio1.currentTime = 0;
    audio1.volume = 0.05;
    safePlay(audio1);
}


// 2. BOSS WARNING phase → lower background + play audio4
function AUDIO_BOSS_WARNING(){
    smoothVolume(audio1, 0.12);    // background low
    audio4.currentTime = 0;
    safePlay(audio4);
}


// 3. BOSS FIGHT → lower background more + play audio5
function AUDIO_BOSS_FIGHT(){
    smoothVolume(audio1, 0.07);    // even lower
    audio5.currentTime = 0;
    safePlay(audio5);
}


// 4. BOSS WINS → stop background fully + play audio6
function AUDIO_BOSS_WINS(){
    try { audio4.pause(); audio4.currentTime = 0; } catch(e){}
    try { audio5.pause(); audio5.currentTime = 0; } catch(e){}
    rapidFadeOut(audio1);          // full stop
    audio6.currentTime = 0;
    safePlay(audio6);
}


// 5. CHARACTER WINS → stop background fully + play audio7
// (this happens BEFORE blast)
function AUDIO_CHARACTER_WINS(){
    try { audio4.pause(); audio4.currentTime = 0; } catch(e){}
    try { audio5.pause(); audio5.currentTime = 0; } catch(e){}
    rapidFadeOut(audio1);          // full stop
    audio7.currentTime = 0;
    safePlay(audio7);
}


// 6. BLAST SCENE → background stays OFF + play audio8 loop
function AUDIO_BLAST_START(){
    audio8.currentTime = 0;
    safePlay(audio8);
}


// 7. MESSAGE AFTER BLAST → stop blast ambience, play calm music (audio9)
function AUDIO_AFTER_BLAST_MESSAGE(){
    audio8.pause();
    audio8.currentTime = 0;

    audio9.currentTime = 0;
    audio9.volume = 0.6;     // restore actual volume
    safePlay(audio9);
}


// 8. RESTART → stop all audio + restart background fresh
function AUDIO_RESTART(){
    stopAllAudio();
    
    audio1.currentTime = 0;
    audio1.volume = 0.05;
    safePlay(audio1);
}
  const groundImg = new Image(); groundImg.src = "ground.jpg";
  const playerImg = new Image(); playerImg.src = "character.png";
  const obstacleImg = new Image(); obstacleImg.src = "obstacle.png";
  const bossImg = new Image(); bossImg.src = "boss_monster.jpeg";

  // State
  let width = innerWidth, height = innerHeight, deviceRatio = Math.max(1, window.devicePixelRatio || 1);
  let visualScale = 1;
  let groundHeight = 90;

  let running = false, paused = false, started = false, userGestureDone = false;
  let score = 0;
  let lastTime = performance.now(), rafId = null;

  // Player
  let player = null;

  // Entities
  let obstacles = [], bullets = [], explosions = [], dustParticles = [];
  let spawnTimer = 0, spawnInterval = 1300, gameSpeed = 4;

  // Auto-fire
  let fireTimer = 0; const FIRE_INTERVAL = 500;
  let isPreBossFire = false;

  // Boss
  let BOSS_SCORE_THRESHOLD = 250; // user will change as needed
  let boss = null, bossIntro = false, inBossPhase = false, allowObstacles = true;

  // End game
  let gameOver = false;

  // Utility safe play
  
  function spawnDust(x, y) {
  const angle = (Math.random() * 0.6) - 0.3; // slight left & right spread

  dustParticles.push({
    x,
    y: y - 4 * visualScale,                       // slight lift above ground
    r: (3 + Math.random() * 7) * visualScale,     // bigger, varied
    vx: (-1.5 - Math.random() * 1.2) + Math.cos(angle) * 0.4,
    vy: (Math.random() * -0.4),                   // slight upward float
    life: 450 + Math.random() * 120,              // smoother fade
    start: performance.now(),

    // 🔥 NEW: irregular shape modifier
    shapeOffset: Math.random() * Math.PI * 2,

    shrink: 0.92 + Math.random() * 0.05,          // shrink over time
    color: `rgba(${180 + Math.random()*30}, ${160 + Math.random()*25}, ${120 + Math.random()*20}, 1)`
  });
}
  // Layout helpers
  function resize() {
    width = window.innerWidth;
    height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    deviceRatio = Math.max(1, window.devicePixelRatio || 1);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    canvas.width = Math.floor(width * deviceRatio);
    canvas.height = Math.floor(height * deviceRatio);
    ctx.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0);
    visualScale = Math.min(width, Math.max(560, height)) / 900;
    groundHeight = Math.max(70, 90 * visualScale);
    if (player) {
      const gY = getGroundY();
      if (player.y + player.h > gY) { player.y = gY - player.h; player.vy = 0; player.grounded = true; }
    }
    // Re-align obstacles to new ground
for (let ob of obstacles) {
    const oldHeight = ob.h;

    ob.w = Math.max(28, 40 * visualScale * (width < height ? 1 : 0.9));

    const MAX_H = 80 * visualScale;
    const MIN_H = 35 * visualScale;

    // ratio match height
    const ratio = ob.h / oldHeight; 
    ob.h = MIN_H + Math.random() * (MAX_H - MIN_H);

    ob.y = getGroundY() - ob.h;
}
  }
  function getGroundY() { return height - groundHeight; }

const bgImg = new Image();
bgImg.src = "background.png";

  // Init
  function init(fullReset = true) {
    resize();
    player = {
      x: 90 * visualScale,
      y: getGroundY() - 56 * visualScale,
      w: 46 * visualScale,
      h: 56 * visualScale,
      vy: 0,
      gravity: 0.9 * visualScale,
      jumpPower: 17 * visualScale,
      grounded: true
    };
    obstacles = []; bullets = []; explosions = [];
    spawnTimer = 0; spawnInterval = 1300; gameSpeed = 4;
    fireTimer = 0; isPreBossFire = false;
    score = 0;
    running = false; paused = false; started = false; userGestureDone = false;
    boss = null; bossIntro = false; inBossPhase = false; allowObstacles = true;
    gameOver = false;
    overlay.textContent = "Tap / Click / Press Space to start";
    document.body.style.backgroundImage = 'url(background.jpg)';
    overlay.style.display = "block";
    pauseMenu.style.display="none";
    restartBtn.style.display = "none";
    exitBtn.style.display = "none";
    bossHpBar.style.display = "none";
    pauseBtn.style.display = "block";   // or "flex" if needed
    blastOverlay.style.display = "none";
    blastOverlay.style.opacity = '0';
    updateScoreDisplay();
    if (!rafId) rafId = requestAnimationFrame(loop);
  }

  // Spawn obstacle
  function spawnObstacle() {
    if (!allowObstacles) return;

    // ORIGINAL WIDTH (unchanged)
    const w = Math.max(28, 40 * visualScale * (width < height ? 1 : 0.9));

    // RANDOM HEIGHT (within your original max)
    const MAX_H = 80 * visualScale;
    const MIN_H = 35 * visualScale;    // you can adjust if needed

    const h = MIN_H + Math.random() * (MAX_H - MIN_H);

    obstacles.push({
        x: width + w + 10,
        y: getGroundY() - h,
        w,
        h
    });

    // Speed & spawn logic stays same
    gameSpeed = Math.min(14, gameSpeed + 0.1);
    spawnInterval = Math.max(500, spawnInterval - 0.5);
}
  // Collisions
  function collides(a, b) {
    return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
  }

  // Player functions
  function jump() {
    if (!running || paused || gameOver) return;
    if (player.grounded) {
      player.vy = -player.jumpPower;
      player.grounded = false;
      safePlay(audio2);
    }
  }
  function updatePlayer(delta) {
  const dt = Math.min(delta, 32) / 16;

  // Gravity
  player.vy += player.gravity * dt;
  player.y += player.vy * dt;

  const ground = getGroundY();

  // Landing detection
  if (player.y + player.h >= ground) {

    // Detect landing only if falling down, not every frame
    if (!player.grounded) {
      // landing burst (ONE time)
      for (let i = 0; i < 6; i++) {
        spawnDust(player.x + player.w * 0.5, ground);
      }
    }

    // Correct player to ground
    player.y = ground - player.h;
    player.vy = 0;
    player.grounded = true;

  } else {
    player.grounded = false;
  }
}

  // Bullets
  function spawnPlayerBullet() {
    if (gameOver) return;

    bullets.push({
        x: player.x + player.w,
        y: player.y + player.h / 2 - 12,
        w: 50 * visualScale,   // football width
        h: 50 * visualScale,   // football height (square)
        vx: 7                // speed
    });
}
  function updateBullets(delta) {
    const dt = delta / 16;
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i]; b.x += b.vx * dt;
      if (boss && collides(b, boss)) {
        boss.hp -= 7; spawnExplosion(b.x, b.y, 40, 350); updateBossHpBar(); bullets.splice(i, 1);
        if (boss.hp <= 0) handleBossDefeat();
        continue;
      }
      if (b.x > width + 100) bullets.splice(i, 1);
    }
  }

  // Explosions
  function spawnExplosion(x, y, maxR = 60, dur = 700) { explosions.push({ x, y, start: performance.now(), duration: dur, maxR, r: 0 }); }
  function updateExplosions(now) {
    for (let i = explosions.length - 1; i >= 0; i--) {
      const ex = explosions[i]; const t = (now - ex.start) / ex.duration;
      if (t >= 1) { explosions.splice(i, 1); continue; }
      ex.r = Math.max(0, ex.maxR * t);
    }
  }

  // Drawing
  
  function drawDust() {
  const now = performance.now();

  for (const p of dustParticles) {
    const t = (now - p.start) / p.life;
    const alpha = Math.max(0, 1 - t);

    const baseX = p.x;
    const baseY = p.y;

    const size = p.r;

    ctx.save();
    ctx.globalAlpha = alpha * 0.8; // softer fade
    ctx.fillStyle = p.color;

    // Create a dust cloud using 3 overlapping soft blobs
    ctx.beginPath();
    ctx.ellipse(baseX, baseY, size * 1.2, size * 0.6, 0, 0, Math.PI * 2);

    ctx.ellipse(baseX - size * 0.6, baseY + size * 0.2, size * 0.9, size * 0.45, 0, 0, Math.PI * 2);

    ctx.ellipse(baseX + size * 0.6, baseY + size * 0.15, size * 0.95, size * 0.55, 0, 0, Math.PI * 2);
ctx.ellipse(baseX, baseY, size * (1.1 + Math.sin(p.shapeOffset)*0.15), size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
  
  function drawGround() {
    if (groundImg && groundImg.complete && groundImg.naturalWidth) {
      ctx.drawImage(groundImg, 0, getGroundY(), width, groundHeight);
    } else {
      ctx.fillStyle = "#2b7a2b"; ctx.fillRect(0, getGroundY(), width, groundHeight);
    }
  }
  function drawPlayer() {
    if (playerImg && playerImg.complete && playerImg.naturalWidth) ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);
    else { ctx.fillStyle = "#ffd166"; ctx.fillRect(player.x, player.y, player.w, player.h); }
  }
  function drawObstacles() {
    for (const ob of obstacles) {
      if (obstacleImg && obstacleImg.complete && obstacleImg.naturalWidth) ctx.drawImage(obstacleImg, ob.x, ob.y, ob.w, ob.h);
      else { ctx.fillStyle = "#8b5e3c"; ctx.fillRect(ob.x, ob.y, ob.w, ob.h); }
    }
  }
  function drawBullets() {
    for (const b of bullets) {
        if (bulletImg.complete && bulletImg.naturalWidth) {
            ctx.drawImage(bulletImg, b.x, b.y, b.w, b.h);
        } else {
            ctx.fillStyle = "#fff"; 
            ctx.fillRect(b.x, b.y, b.w, b.h);  // fallback
        }
    }
}
  function drawBoss() {
    if (!boss) return;
    if (bossImg && bossImg.complete && bossImg.naturalWidth) ctx.drawImage(bossImg, boss.x, boss.y, boss.w, boss.h);
    else { ctx.fillStyle = "#7a2230"; ctx.fillRect(boss.x, boss.y, boss.w, boss.h); }
  }
  function drawExplosions() {
    for (const ex of explosions) { const alpha = 1 - Math.min(1, ex.r / ex.maxR); ctx.beginPath(); ctx.fillStyle = `rgba(255,200,80,${0.6 * alpha})`; ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI * 2); ctx.fill(); }
  }

  // Score + obstacle collisions
  function updateScoreDisplay() { scoreEl.textContent = `Score: ${Math.floor(score)}`; }
  function checkObstacleCollisions() {
    for (const ob of obstacles) {
      if (!inBossPhase && collides(ob, player)) {
        safePlay(audio3);
if (navigator.vibrate) navigator.vibrate([120, 80, 120]);
        rapidFadeOut(audio1);
        endGame(`Game Over — Score: ${Math.floor(score)}`);
        return;
      }
    }
  }

  // Boss behavior
  function spawnBoss() {
    const w = 90 * visualScale;
    const h = 80 * visualScale;
    boss = { x: width + 50, y: getGroundY() - h, w, h, vx: -2, hp: 200, maxHp: 200 };
    bossHpBar.style.display = 'block'; updateBossHpBar();

    // Smoothly shift player right a bit for patrol room
    const targetX = Math.min(width - player.w - 140 * visualScale, player.x + 290 * visualScale);
    let steps = 50; const shiftAmt = (targetX - player.x) / steps;
    const shiftInterval = setInterval(() => {
      player.x += shiftAmt; steps--; if (steps <= 0) clearInterval(shiftInterval);
    }, 16);
  }
  function updateBossHpBar() { if (!boss) return; const pct = Math.max(0, boss.hp / boss.maxHp); bossHpInner.style.width = (pct * 100) + '%'; }

  function updateBoss(delta) {
    if (!boss) return;
    const move = boss.vx * (delta / 16);
    boss.x += move;
    if (boss.x < 60) boss.vx = Math.abs(boss.vx);
    if (boss.x + boss.w > width - 60) boss.vx = -Math.abs(boss.vx);
  if (collides(player, boss)) {
    safePlay(audio3);   // hit sound
    safePlay(audio6);   // boss wins sound
    if (navigator.vibrate) navigator.vibrate([200, 60, 200]);
    AUDIO_BOSS_WINS();
    endGame("Boss Defeated You!");
}
  }

  // End game handler
  function endGame(message) {
    running = false;
    gameOver = true;
    inBossPhase = false;
    bossIntro = false;
    allowObstacles = false;
    isPreBossFire = false;
    overlay.textContent = message;
    overlay.style.display = 'block';
    restartBtn.style.display = 'block';
    exitBtn.style.display = 'block';
  }

  // Boss defeat flow (1.5s -> blast -> single final message -> restart/exit)
  
  function fadeBackgroundImage(newImage) {
    document.body.style.opacity = "0";  // fade out

    setTimeout(() => {
        document.body.style.backgroundImage = `url("${newImage}")`;
        document.body.style.opacity = "1"; // fade back in
    }, 100); // time matches CSS transition
}
function handleBossDefeat() {
AUDIO_CHARACTER_WINS();
safePlay(audio7);
    // STOP BOSS WARNING IMMEDIATELY
    overlay.style.display = "none";

    running = false;
    gameOver = true;
    inBossPhase = false;

    // Hide UI
    scoreEl.style.display = 'none';
    bossHpBar.style.display = 'none';
    bossHpInner.style.display = 'none';
    pauseBtn.style.display = 'none';

    boss = null;

    // --- MESSAGE 1 ---
    overlay.style.whiteSpace="normal";
    overlay.textContent = "You Make Didi As The New PM OF India";
    overlay.style.display = "block";

    // After 1.5 sec → start blast
    setTimeout(() => {

        // --- MESSAGE 2 --- //
        // --- MESSAGE 2 STYLE (FULLY VISIBLE DURING BLAST) ---
overlay.style.background = "rgba(0,0,0,0.92)";
overlay.style.color = "#fffce8";
overlay.style.textShadow = "0 0 10px rgba(255,200,80,1), 0 0 22px rgba(255,120,0,1)";
overlay.style.whiteSpace = "normal";
overlay.style.fontWeight = "900";
overlay.style.letterSpacing = "1px";
overlay.style.border = "2px solid rgba(255,120,0,1)";
overlay.style.zIndex = "999999999999";
overlay.style.boxShadow = "0 0 20px rgba(255,140,0,1)";

// Set text
overlay.textContent = "YOUR MESSAGE 2";
overlay.style.display = "block";
        // Start blast
       safePlay(audio7);
       AUDIO_BLAST_START();

if (navigator.vibrate) {
    navigator.vibrate([
        320, 70,   // stronger first hit
        320, 70,   // stronger second hit
        420, 110,  // huge explosion pulse
        200        // aftershock
    ]);
    }
document.body.classList.add("shake-screen");
setTimeout(() => {
    document.body.classList.remove("shake-screen");
}, 400);
        blastOverlay.style.display = 'block';
        requestAnimationFrame(() => {
            blastOverlay.style.opacity = '1';
            
        });
fadeBackgroundImage("background1.jpg");
        // Fade out blast
        setTimeout(() => {
        
            blastOverlay.style.opacity = '0';
overlay.style.display="none";

            setTimeout(() => {
                blastOverlay.style.display = 'none';

                // --- FINAL MESSAGE AFTER BLAST --- 
                // --- FINAL MESSAGE AFTER BLAST (Message 3 – normal look) --- 
overlay.style.display = "block";

// RESET all strong blast styles from Message 2
overlay.style.background = "rgba(0,0,0,0.65)";
overlay.style.color = "#fff";
overlay.style.textShadow = "none"; 
overlay.style.border = "none";
overlay.style.boxShadow = "none";
overlay.style.letterSpacing = "0px";
overlay.style.fontWeight = "600";
overlay.style.zIndex = "999";  // normal z-index

// Set final message
overlay.textContent = "YOUR MESSAGE 3";

restartBtn.style.display = 'block';
exitBtn.style.display = 'block';
AUDIO_AFTER_BLAST_MESSAGE();
            }, 1000);
        }, 1500);

    }, 2500);
}  // Boss approach sequence: stop spawning, show message, start autofire, wait 2s then spawn after obstacles clear
  function startBossSequence() {
    if (bossIntro || inBossPhase || gameOver) return;

    bossIntro = true;
    allowObstacles = false;
    isPreBossFire = true;
    spawnTimer = Infinity;

    AUDIO_BOSS_WARNING();
    // Show warning
    overlay.textContent = "PM Narendra Modi Is Coming";
    overlay.style.display = "block";

    setTimeout(() => {

        function waitUntilClear() {

            // 🚫 STOP if boss is already dead
            if (gameOver) return;

            if (obstacles.length === 0) {

                // 🚫 STOP if boss got killed before entry
                if (gameOver) return;

                bossIntro = false;
                isPreBossFire = false;
                inBossPhase = true;

                spawnBoss();
                player.gravity = 0.55 * visualScale;
                overlay.style.display = "none";
AUDIO_BOSS_FIGHT();

            } else {
                requestAnimationFrame(waitUntilClear);
            }
        }

        requestAnimationFrame(waitUntilClear);

    }, 2000);
}
  // Auto-fire: only during warning or boss
  function autoFire(delta) {
    if (gameOver) return;
    fireTimer += delta;
    if ((isPreBossFire || inBossPhase) && fireTimer >= FIRE_INTERVAL) {
      fireTimer = 0;
      spawnPlayerBullet();
    }
  }

  // Update helpers
  
  function updateDust(now) {
  for (let i = dustParticles.length - 1; i >= 0; i--) {
    const p = dustParticles[i];
    const t = now - p.start;

    if (t >= p.life || p.r < 0.5) {
      dustParticles.splice(i, 1);
      continue;
    }

    p.x += p.vx;
    p.y += p.vy;

    // Gravity pull downward slightly
    p.vy += 0.02;

    // Shrink radius gradually
    p.r *= p.shrink;
  }
}
  
    // small helpers at end
  function updateObstacles(delta){ const move = gameSpeed * (delta/16); for (let i = obstacles.length - 1; i >= 0; i--) { obstacles[i].x -= move; if (obstacles[i].x + obstacles[i].w < -50) obstacles.splice(i,1); } }
  function updateScoreDisplay(){ scoreEl.textContent = `Score: ${Math.floor(score)}`; }
  
  // --- FULLSCREEN BUTTON ---
// --- FULLSCREEN BUTTON ---
const fsBtn = document.getElementById("fsBtn");

fsBtn.addEventListener("click", () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(()=>{});
        fsBtn.textContent = "⤢";  // exit fullscreen symbol
    } else {
        document.exitFullscreen();
        fsBtn.textContent = "⛶";  // fullscreen symbol
    }
});

  // Main loop
  function update(now) {
    rafId = requestAnimationFrame(loop);
    const delta = now - lastTime;
    lastTime = now;

    // backing store fix
    if (canvas.width !== Math.floor(width * deviceRatio) || canvas.height !== Math.floor(height * deviceRatio)) {
      canvas.width = Math.floor(width * deviceRatio); canvas.height = Math.floor(height * deviceRatio);
      ctx.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0);
    }

    ctx.clearRect(0, 0, width, height);
    drawGround();

    // IMPORTANT: player movement continues even during bossIntro. We removed the bossIntro blockade.
    if (running && !paused && !gameOver) {
      // spawn obstacles if allowed
      if (allowObstacles) {
        spawnTimer += delta;
        const interval = Math.max(700, spawnInterval - gameSpeed * 25);
        if (spawnTimer > interval + Math.random() * 300) { spawnTimer = 0; spawnObstacle(); }
      }

      updatePlayer(delta);
      updateObstacles(delta);
      updateBullets(delta);
      updateExplosions(performance.now());
      autoFire(delta);

      if (!inBossPhase && Math.floor(score) >= BOSS_SCORE_THRESHOLD) startBossSequence();
      if (inBossPhase) updateBoss(delta);

      if (!inBossPhase) checkObstacleCollisions();

      score += delta * 0.01; updateScoreDisplay();
    } else {
      // paused or not running OR bossIntro: we still let obstacles move and bullets update so visuals remain natural
      updateExplosions(performance.now());
      return;
      }
    

    // draw entities always
    drawDust();
    drawObstacles();
    drawBullets();
    drawPlayer();
    drawBoss();
    drawExplosions();
  }
  function loop(now) { update(now); }

  // Input handling
  function onUserGestureStart() {
    userGestureDone = true;

    // unlock all audios on first touch
    audio9.volume = 0;
    safePlay(audio9);       // 🔥 IMPORTANT: unlock audio9 autoplay
    audio9.pause();
    audio9.currentTime = 0;

    safePlay(audio1);

    if (!started) {

        started = true;
        running = true;
        overlay.style.display = 'none';
        lastTime = performance.now();
        AUDIO_START_GAMEPLAY();
        return;
        
    }

    // do not resume by tapping; resume only via resume button
    if (paused) return;

    // ❌ REMOVED auto-restart on tap after game over
    if (gameOver) return;

    jump();
}

  function onKeyDown(e) {
   if (gameOver && e.code === "Space") init(true);
    if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) { e.preventDefault(); onUserGestureStart(); return; }
    if (e.code === 'KeyP') { if (running) togglePause(!paused); }
  }

  let touchStartY = null; const SWIPE_MIN_DIST = 20;
  function onTouchStart(e) { if (e.touches && e.touches.length) touchStartY = e.touches[0].clientY; onUserGestureStart(); }
  function onTouchMove(e) { if (!touchStartY || !e.touches || !e.touches.length) return; const dy = touchStartY - e.touches[0].clientY; if (dy > SWIPE_MIN_DIST) { jump(); touchStartY = null; } }
  function onTouchEnd() { touchStartY = null; }

  // Pause UI
  function togglePause(show) {
    if (gameOver) return;

    paused = show;
    pauseMenu.style.display = show ? 'block' : 'none';
    pauseMenu.setAttribute('aria-hidden', String(!show));

    if (show) {
        // Pause game, but DO NOT show overlay text
        try { audio1.pause(); } catch (e) {}
        overlay.style.display = 'none';   // ✅ Hide overlay text during pause
    } else {
        // Resume
        overlay.style.display = 'none';   // Ensure it's hidden
        if (userGestureDone) safePlay(audio1);
        lastTime = performance.now();
    }
}

  // UI bindings
  pauseBtn.addEventListener('click', () => { if (!started) return; togglePause(!paused); });
  resumeBtn.addEventListener('click', () => { if (!started) return; togglePause(false); });
  restartGameBtn.addEventListener('click', () => { stopAllAudio(); init(true); });
  exitGameBtn.addEventListener('click', () => { stopAllAudio(); exitGame(); });
  restartBtn.addEventListener('click', () => { AUDIO_RESTART(); init(true); });
  exitBtn.addEventListener('click', () => { stopAllAudio(); exitGame(); });

  function exitGame() {
    stopAllAudio();

    // 🧹 Clear login ONLY for Web (not app)
    if (!window.Android) {
        localStorage.removeItem("login");
    }

    // 1️⃣ If inside HTML2APK → close app
    if (window.Android && typeof Android.closeApp === "function") {
        Android.closeApp();
        return;
    }

    // 2️⃣ If normal browser → return to homepage
    if (typeof window !== "undefined" && location.protocol.startsWith("http")) {
        window.location.href = "index.html";
        return;
    }

    // 3️⃣ Fallback
    init(true);
}

  canvas.addEventListener('pointerdown', onUserGestureStart);
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); onTouchStart(e); }, { passive: false });
  canvas.addEventListener('touchmove', (e) => { onTouchMove(e); }, { passive: true });
  canvas.addEventListener('touchend', onTouchEnd, { passive: true });
  window.addEventListener('keydown', onKeyDown);
window.addEventListener('resize', () => {
    resize();

    // If game started and NOT gameOver → simply pause
    if (started && !gameOver) {
        paused = true;
        pauseMenu.style.display = 'block';
        pauseMenu.setAttribute('aria-hidden', 'false');

        // hide overlay text
        overlay.style.display = 'none';

        try { audio1.pause(); } catch (e) {}

        // IMPORTANT: keep running = true so game resumes correctly
        running = true;
    }
});
  document.addEventListener('visibilitychange', () => { if (document.hidden && running && !paused) stopAllAudio(); togglePause(true); });

  // cleanup
  window.addEventListener('pagehide', () => { if (rafId) cancelAnimationFrame(rafId); });
  window.addEventListener('focus', () => { lastTime = performance.now(); });

  // Asset preload then init
const assets = [
    new Promise(r => { groundImg.onload = r; groundImg.onerror = r; setTimeout(r, 1200); }),
    new Promise(r => { playerImg.onload = r; playerImg.onerror = r; setTimeout(r, 1200); }),
    new Promise(r => { obstacleImg.onload = r; obstacleImg.onerror = r; setTimeout(r, 1200); }),
    new Promise(r => { bossImg.onload = r; bossImg.onerror = r; setTimeout(r, 1200); }),

    // Audio preload
    new Promise(r => { audio1.oncanplaythrough = r; audio1.onerror = r; setTimeout(r, 1200); }),
    new Promise(r => { audio2.oncanplaythrough = r; audio2.onerror = r; setTimeout(r, 1200); }),
    new Promise(r => { audio3.oncanplaythrough = r; audio3.onerror = r; setTimeout(r, 1200); }),
    new Promise(r => { audio4.oncanplaythrough = r; audio4.onerror = r; setTimeout(r, 1200); }),
    new Promise(r => { audio5.oncanplaythrough = r; audio5.onerror = r; setTimeout(r, 1200); }),
    new Promise(r => { audio6.oncanplaythrough = r; audio6.onerror = r; setTimeout(r, 1200); }),
    new Promise(r => { audio7.oncanplaythrough = r; audio7.onerror = r; setTimeout(r, 1200); }),
    new Promise(r => { audio8.oncanplaythrough = r; audio8.onerror = r; setTimeout(r, 1200); }),
    new Promise(r => { audio9.oncanplaythrough = r; audio9.onerror = r; setTimeout(r, 1200); })
];

Promise.all(assets).then(() => init(true)).catch(() => init(true));


// Keep icon updated
document.addEventListener("fullscreenchange", () => {
    fsBtn.textContent = document.fullscreenElement ? "⤢" : "⛶";
});
const INSTAGRAM_USERNAME = "piyush___editz__";  
const INSTAGRAM_URL = `https://www.instagram.com/piyush___editz__?igsh=MWx1aGFmaDVrdTZ0Mw==`;

document.getElementById("topHeader").addEventListener("click", () => {

    // If running inside HTML2APK with Android bridge
    try {
        if (window.Android && typeof Android.openUrl === "function") {
            Android.openUrl(INSTAGRAM_URL);
            return;
        }
    } catch (e) {}

    // Normal browser fallback
    const win = window.open(INSTAGRAM_URL, "_blank");
    if (!win) location.href = INSTAGRAM_URL;
});
const bulletImg = new Image();
bulletImg.src = "bullet.png";
})();
