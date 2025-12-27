// ================== PLATFORM DETECTION ==================
const UA = navigator.userAgent || "";
const isApp = UA.startsWith("Dalvik/");     // APK
const isBrowser = /Mozilla\/5\.0/.test(UA); // Normal browser
const FORCE_POPUP_DEBUG = false;

// ================== VIBRATION TEST (NO USER ACTION REQUIRED) ==================
function testVibration() {
    return new Promise(resolve => {
        if (!navigator.vibrate) {
            resolve(false);
            return;
        }

        try {
            const result = navigator.vibrate([5, 5, 5]);
            setTimeout(() => resolve(result === true), 40);
        } catch {
            resolve(false);
        }
    });
}

// ================== SHOW POPUP AFTER LOADER IF VIBRATION FAILS ==================
window.addEventListener("load", async () => {

    // ---------- APP (Dalvik) ----------
    if (isApp) {
    window.__SHOW_VIB_POPUP__ = true;
    return;
}
    // ---------- BROWSER ----------
    setTimeout(async () => {
        const works = await testVibration();
        if (!works) {
            showVibrationPopup(); // ⏱ after test
        }
    }, 10000); // small delay is enough
});

    function showVibrationPopup() {
    const box = document.getElementById("apkVibrationPopup");
    const txt = document.getElementById("apkVibText");
    const okBtn = document.getElementById("apkVibOK");
    const cancelBtn = document.getElementById("apkVibCancel");

    if (!box || !txt || !okBtn || !cancelBtn) return;

    if (isApp) {
        txt.innerHTML = `Vibration is not working on this device.<br>For best gameplay, do you want to continue in browser?`;
        cancelBtn.style.display = "inline-flex";
    } if(isBrowser) {
        txt.innerHTML = `
            Your browser does not support vibration.<br>
            Click OK to continue without vibration.
        `;
        cancelBtn.style.display = "none";
    }

    box.style.display = "flex";

    okBtn.onclick = () => {
    box.style.display = "none";

    // 🔥 FIX #3: re-sync canvas after popup
    setTimeout(() => {
    if (window.__gameResize__) window.__gameResize__();
}, 50);

    if (isApp) {
        const url = "https://piyush1234-lab.github.io/Didi.github.io/didi.html?apk=1";

            try {
                if (window.Android && Android.openUrl) {
                    Android.openUrl(url);
                    return;
                }
            } catch (e) {}

            window.location.href = url;
        } else {
            box.style.display = "none";
        }
    };

    cancelBtn.onclick = () => {
    box.style.display = "none";

    // 🔥 FIX #3: re-sync canvas after popup
    setTimeout(() => {
        if (typeof resize === "function") resize();
    }, 50);
    }
};
document.addEventListener("DOMContentLoaded", () => {
    // -------- Loader logic --------
    let fakePercent = 0;
    const fill = document.getElementById("loadFill");
    const percentTxt = document.getElementById("loadPercent");

    const fake = setInterval(() => {
        fakePercent += Math.random() * 7;
        if (fakePercent > 90) fakePercent = 90;

        if (fill) fill.style.width = fakePercent + "%";
        if (percentTxt) percentTxt.textContent = Math.round(fakePercent) + "%";
    }, 200);

    window.addEventListener("load", () => {
        clearInterval(fake);

        if (fill) fill.style.width = "100%";
        if (percentTxt) percentTxt.textContent = "100%";

        setTimeout(() => {
            const loader = document.getElementById("loader");
            if (loader) {
                loader.style.opacity = "0";
                setTimeout(() => {
                    loader.style.display = "none";
                }, 700);
            }
        }, 300);
    });

    // -------- APK vs Web UI control (fsBtn + topHeader) --------
    const topHeader = document.getElementById("topHeader");
    const fsBtn = document.getElementById("fsBtn");

    if (isApp) {
        // Inside APK (WebIntoApp → Dalvik UA)
        if (topHeader) topHeader.style.display = "flex";  // show insta header
        if (fsBtn) fsBtn.style.display = "none";          // hide fullscreen button
    } else {
        // In normal browser
        if (topHeader) topHeader.style.display = "none";
        if (fsBtn) fsBtn.style.display = "flex";
    }
});


// ================== GAME CODE ==================
(() => {

  // -------- LOGIN CHECK: only for WEB, not APK --------
  if (!isApp) {
      const loginStatus = localStorage.getItem("login");
      if (loginStatus !== "true") {
          window.location.href = "index.html";
      }
  }

  // -------- Elements --------
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
  const fsBtn = document.getElementById("fsBtn");
  const topHeader = document.getElementById("topHeader");

  /* ------------------ AUDIO SETUP (9 Audios) ------------------ */

  const audio1 = new Audio("audio1.mp3");  // background
  audio1.loop = true;
  audio1.volume = 0.05;

  const audio2 = new Audio("audio2.wav");  // jump
  audio2.volume= 0.08;
  
  const audio3 = new Audio("audio3.wav");  // hit obstacle

  const audio4 = new Audio("audio4.mp3");  // boss warning
  audio4.loop = false;
  audio4.volume = 1;

  const audio5 = new Audio("audio5.mp3");  // boss fight
  audio5.loop = true;

  const audio6 = new Audio("audio6.mp3");  // boss wins
  const audio7 = new Audio("audio7.mp3");  // character wins

  const audio8 = new Audio("audio8.mp3");  // blast ambience
  audio8.loop = false;

  const audio9 = new Audio("audio9.mp3");  // calm post blast
  audio9.loop = false;


  /* ------------------ VIBRATION (navigator.vibrate ONLY) ------------------ */

  function safeVibrate(pattern) {
      if (!navigator.vibrate) return;
      const p = Array.isArray(pattern) ? pattern : [pattern];
      navigator.vibrate(p);
  }
function stopAllAudio() {
    [
        audio1, audio2, audio3,
        audio4, audio5, audio6,
        audio7, audio8, audio9
    ].forEach(a => {
        try {
            a.pause();
            a.currentTime = 0;
        } catch (e) {}
    });
}

  /* ------------------ AUDIO HELPERS ------------------ */

  function safePlay(a) {
      const p = a.play();
      if (p && p.catch) p.catch(() => {});
  }

  function smoothVolume(audio, target, speed = 0.03) {
      clearInterval(audio._fade);
      audio._fade = setInterval(() => {
          if (Math.abs(audio.volume - target) < 0.03) {
              audio.volume = target;
              clearInterval(audio._fade);
          } else if (audio.volume < target) {
              audio.volume += speed;
          } else {
              audio.volume -= speed;
          }
          audio.volume = Math.min(1, Math.max(0, audio.volume));
      }, 60);
  }

  function rapidFadeOut(audio) {
      clearInterval(audio._fade);
      audio._fade = setInterval(() => {
          audio.volume = Math.max(0, audio.volume - 0.15);
          if (audio.volume <= 0) {
              audio.volume = 0;
              audio.pause();
              clearInterval(audio._fade);
          }
      }, 50);
  }

  function pauseAllAudio() {
    [audio1, audio2, audio3, audio4, audio5, audio6, audio7, audio8, audio9]
        .forEach(a => {
            try { a.pause(); } catch (e) {}
        });
}

function togglePause(show) {
    if (gameOver) return;

    paused = show;
    pauseMenu.style.display = show ? 'block' : 'none';

    if (show) {
        // ⏸ PAUSE
        cancelJumpHint(false); // preserve remaining hint time
        pauseAllAudio();

    } else {
        // ▶ RESUME
        lastTime = performance.now();
        running = true;

        if (userGestureDone) safePlay(audio1);

        // Resume tutorial ONLY if time remains
        if (hintRemaining > 0 && !gameOver) {
            showJumpHint();
        }

        if (!rafId) {
            rafId = requestAnimationFrame(loop);
        }
    }
}

  /* ------------------ AUDIO TIMELINE HOOKS ------------------ */

  function AUDIO_START_GAMEPLAY() {
      audio1.currentTime = 0;
      audio1.volume = 0.05;
      safePlay(audio1);
  }

  function AUDIO_BOSS_WARNING() {
      smoothVolume(audio1, 0.12);
      audio4.currentTime = 0;
      safePlay(audio4);
  }

  function AUDIO_BOSS_FIGHT() {
      smoothVolume(audio1, 0.07);
      audio5.currentTime = 0;
      safePlay(audio5);
  }

  function AUDIO_BOSS_WINS() {
      try { audio4.pause(); audio4.currentTime = 0; } catch (e) {}
      try { audio5.pause(); audio5.currentTime = 0; } catch (e) {}
      rapidFadeOut(audio1);
      audio6.currentTime = 0;
      safePlay(audio6);
  }

  function AUDIO_CHARACTER_WINS() {
      try { audio4.pause(); audio4.currentTime = 0; } catch (e) {}
      try { audio5.pause(); audio5.currentTime = 0; } catch (e) {}
      rapidFadeOut(audio1);
      audio7.currentTime = 0;
      safePlay(audio7);
  }

  function AUDIO_BLAST_START() {
      audio8.currentTime = 0;
      safePlay(audio8);
  }

  function AUDIO_AFTER_BLAST_MESSAGE() {
      audio8.pause();
      audio8.currentTime = 0;
      audio9.currentTime = 0;
      audio9.volume = 0.6;
      safePlay(audio9);
  }

  function AUDIO_RESTART() {
      stopAllAudio();
      audio1.currentTime = 0;
      audio1.volume = 0.05;
      safePlay(audio1);
  }

  /* ------------------ IMAGES ------------------ */

  const groundImg = new Image(); groundImg.src = "ground.jpg";
  const bgImg = new Image();
bgImg.src = "background.jpg";
  const playerImg = new Image(); playerImg.src = "character.png";
  const obstacleImg = new Image(); obstacleImg.src = "obstacle.png";
  const bossImg = new Image(); bossImg.src = "boss_monster.jpeg";
  const bulletImg = new Image(); bulletImg.src = "bullet.png";
  

  /* ------------------ GAME STATE ------------------ */

  let width = innerWidth,
      height = innerHeight,
      deviceRatio = Math.max(1, window.devicePixelRatio || 1);
  let visualScale = 1;
  let groundHeight = 90;
  let freezeGround = false;
let groundSlowFactor = 1; // 1 → moving, 0 → stopped
  let skyOffset=0;
  let groundOffset=0;
  let running = false, paused = false, started = false, userGestureDone = false;
  let score = 0;
  let lastTime = performance.now(), rafId = null;

  let player = null;
  let obstacles = [], bullets = [], explosions = [], dustParticles = [];
  let spawnTimer = 0, spawnInterval = 1300, gameSpeed = 4;

  let fireTimer = 0;
  const FIRE_INTERVAL = 500;
  let isPreBossFire = false;

  let BOSS_SCORE_THRESHOLD = 250;
  let boss = null, bossIntro = false, inBossPhase = false, allowObstacles = true;

  let gameOver = false;
  // ----- Jump hint control -----
let hintTimeout = null;
let hintFadeTimeout = null;
let hintActive = false;

  /* ------------------ DUST PARTICLES ------------------ */

  function spawnDust(x, y) {
      const angle = (Math.random() * 0.6) - 0.3;
      dustParticles.push({
          x,
          y: y - 4 * visualScale,
          r: (3 + Math.random() * 7) * visualScale,
          vx: (-1.5 - Math.random() * 1.2) + Math.cos(angle) * 0.4,
          vy: (Math.random() * -0.4),
          life: 450 + Math.random() * 120,
          start: performance.now(),
          shapeOffset: Math.random() * Math.PI * 2,
          shrink: 0.92 + Math.random() * 0.05,
          color: `rgba(${180 + Math.random()*30}, ${160 + Math.random()*25}, ${120 + Math.random()*20}, 1)`
      });
  }

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
          p.vy += 0.02;
          p.r *= p.shrink;
      }
  }
function drawSky() {
    if (!bgImg.complete) return;

    const x = skyOffset % width;

    ctx.drawImage(bgImg, x, 0, width, height);
    ctx.drawImage(bgImg, x + width, 0, width, height);
}
  function drawDust() {
      const now = performance.now();
      for (const p of dustParticles) {
          const t = (now - p.start) / p.life;
          const alpha = Math.max(0, 1 - t);
          const size = p.r;
          ctx.save();
          ctx.globalAlpha = alpha * 0.8;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, size * 1.2, size * 0.6, 0, 0, Math.PI * 2);
          ctx.ellipse(p.x - size * 0.6, p.y + size * 0.2, size * 0.9, size * 0.45, 0, 0, Math.PI * 2);
          ctx.ellipse(p.x + size * 0.6, p.y + size * 0.15, size * 0.95, size * 0.55, 0, 0, Math.PI * 2);
          ctx.ellipse(p.x, p.y, size * (1.1 + Math.sin(p.shapeOffset)*0.15), size * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
      }
  }

  /* ------------------ LAYOUT / RESIZE ------------------ */

  function getGroundY() {
      return height - groundHeight;
  }

  function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
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
          if (player.y + player.h > gY) {
              player.y = gY - player.h;
              player.vy = 0;
              player.grounded = true;
          }
      }

      for (let ob of obstacles) {
          ob.w = Math.max(28, 40 * visualScale * (width < height ? 1 : 0.9));
          const MAX_H = 80 * visualScale;
          const MIN_H = 35 * visualScale;
          ob.h = MIN_H + Math.random() * (MAX_H - MIN_H);
          ob.y = getGroundY() - ob.h;
      }
  }
  
window.__gameResize__ = resize;
  /* ------------------ INIT GAME ------------------ */

  function init(fullReset = true) {
    cancelJumpHint();
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
      obstacles = [];
      bullets = [];
      explosions = [];
      dustParticles = [];
      spawnTimer = 0;
      spawnInterval = 1300;
      gameSpeed = 4;
      fireTimer = 0;
      isPreBossFire = false;
      score = 0;
      groundOffset= 0;
      freezeGround = false;
groundSlowFactor = 1;
      running = false;
      paused = false;
      started = false;
      userGestureDone = false;
      boss = null;
      bossIntro = false;
      inBossPhase = false;
      allowObstacles = true;
      gameOver = false;

      overlay.textContent = "Tap / Click / Press Space to start";
document.body.style.background = "#87ceeb"; // fallback sky color
      overlay.style.display = "block";
      pauseMenu.style.display = "none";
      restartBtn.style.display = "none";
      exitBtn.style.display = "none";
      bossHpBar.style.display = "none";
      pauseBtn.style.display = "block";
      blastOverlay.style.display = "none";
      blastOverlay.style.opacity = "0";
      scoreEl.style.display = "block";

      updateScoreDisplay();

      if (!rafId) {
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);
}
  }

  /* ------------------ SPAWN OBSTACLES ------------------ */

  function spawnObstacle() {
      if (!allowObstacles) return;

      const w = Math.max(28, 40 * visualScale * (width < height ? 1 : 0.9));
      const MAX_H = 80 * visualScale;
      const MIN_H = 35 * visualScale;
      const h = MIN_H + Math.random() * (MAX_H - MIN_H);

      obstacles.push({
          x: width + w + 10,
          y: getGroundY() - h,
          w,
          h
      });

      gameSpeed = Math.min(14, gameSpeed + 0.1);
      spawnInterval = Math.max(500, spawnInterval - 0.5);
  }

  /* ------------------ COLLISION ------------------ */

  function collides(a, b) {
      return !(
          a.x + a.w < b.x ||
          a.x > b.x + b.w ||
          a.y + a.h < b.y ||
          a.y > b.y + b.h
      );
  }

  /* ------------------ PLAYER LOGIC ------------------ */

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
      player.vy += player.gravity * dt;
      player.y += player.vy * dt;

      const ground = getGroundY();
      if (player.y + player.h >= ground) {
          if (!player.grounded) {
              for (let i = 0; i < 6; i++) {
                  spawnDust(player.x + player.w * 0.5, ground);
              }
          }
          player.y = ground - player.h;
          player.vy = 0;
          player.grounded = true;
      } else {
          player.grounded = false;
      }
  }

  /* ------------------ BULLETS ------------------ */

  function spawnPlayerBullet() {
      if (gameOver) return;
      bullets.push({
          x: player.x + player.w,
          y: player.y + player.h / 2 - 12,
          w: 50 * visualScale,
          h: 50 * visualScale,
          vx: 7
      });
  }

  function updateBullets(delta) {
      const dt = delta / 16;
      for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i];
          b.x += b.vx * dt;

          if (boss && collides(b, boss)) {
              boss.hp -= 7;
              spawnExplosion(b.x, b.y, 40, 350);
              updateBossHpBar();
              bullets.splice(i, 1);
              if (boss.hp <= 0) handleBossDefeat();
              continue;
          }
          if (b.x > width + 100) bullets.splice(i, 1);
      }
  }

  /* ------------------ EXPLOSIONS ------------------ */

  function spawnExplosion(x, y, maxR = 60, dur = 700) {
      explosions.push({ x, y, start: performance.now(), duration: dur, maxR, r: 0 });
  }

  function updateExplosions(now) {
      for (let i = explosions.length - 1; i >= 0; i--) {
          const ex = explosions[i];
          const t = (now - ex.start) / ex.duration;
          if (t >= 1) {
              explosions.splice(i, 1);
              continue;
          }
          ex.r = Math.max(0, ex.maxR * t);
      }
  }

  /* ------------------ DRAWING ------------------ */

 function drawGround() {
    const y = getGroundY();

    if (groundImg && groundImg.complete && groundImg.naturalWidth) {
        ctx.drawImage(groundImg, groundOffset, y, width, groundHeight);
        ctx.drawImage(groundImg, groundOffset + width, y, width, groundHeight);
    } else {
        ctx.fillStyle = "#2b7a2b";
        ctx.fillRect(groundOffset, y, width, groundHeight);
        ctx.fillRect(groundOffset + width, y, width, groundHeight);
    }
}
  function drawPlayer() {
    if (playerImg.complete && playerImg.naturalWidth > 0) {
        ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);
    } else {
        // 🔥 TEMP PLACEHOLDER (prevents invisible bug)
        ctx.fillStyle = "#ffcc00";
        ctx.fillRect(player.x, player.y, player.w, player.h);
    }
}
  function drawObstacles() {
      for (const ob of obstacles) {
          if (obstacleImg && obstacleImg.complete && obstacleImg.naturalWidth) {
              ctx.drawImage(obstacleImg, ob.x, ob.y, ob.w, ob.h);
          } else {
              ctx.fillStyle = "#8b5e3c";
              ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
          }
      }
  }

  function drawBullets() {
      for (const b of bullets) {
          if (bulletImg && bulletImg.complete && bulletImg.naturalWidth) {
              ctx.drawImage(bulletImg, b.x, b.y, b.w, b.h);
          } else {
              ctx.fillStyle = "#fff";
              ctx.fillRect(b.x, b.y, b.w, b.h);
          }
      }
  }

  function drawBoss() {
      if (!boss) return;
      if (bossImg && bossImg.complete && bossImg.naturalWidth) {
          ctx.drawImage(bossImg, boss.x, boss.y, boss.w, boss.h);
      } else {
          ctx.fillStyle = "#7a2230";
          ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
      }
  }

  function drawExplosions() {
      for (const ex of explosions) {
          const alpha = 1 - Math.min(1, ex.r / ex.maxR);
          ctx.beginPath();
          ctx.fillStyle = `rgba(255,200,80,${0.6 * alpha})`;
          ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI * 2);
          ctx.fill();
      }
  }

  /* ------------------ SCORE & COLLISIONS ------------------ */

  function updateScoreDisplay() {
      scoreEl.textContent = `Score: ${Math.floor(score)}`;
  }

  function checkObstacleCollisions() {
      for (const ob of obstacles) {
          if (!inBossPhase && collides(ob, player)) {
              safePlay(audio3);
              safeVibrate([120, 80, 120]);
              rapidFadeOut(audio1);
              endGame(`Game Over — Score: ${Math.floor(score)}`);
              return;
          }
      }
  }

  /* ------------------ BOSS LOGIC ------------------ */

  function spawnBoss() {
    const w = 90 * visualScale;
    const h = 80 * visualScale;

    const targetX = Math.min(
        width - player.w - 140 * visualScale,
        player.x + 290 * visualScale
    );

    boss = {
        x: width + 50,
        y: getGroundY() - h,
        w,
        h,
        vx: -2,
        hp: 200,
        maxHp: 200,
        targetX,  // ✅ stored correctly
        hasReachedLeft:false
    };

    bossHpBar.style.display = 'block';
    updateBossHpBar();

    // Player shift
    let steps = 50;
    const shiftAmt = (targetX - player.x) / steps;
    const shiftInterval = setInterval(() => {
        player.x += shiftAmt;
        steps--;
        if (steps <= 0) clearInterval(shiftInterval);
    }, 16);
}
  function updateBossHpBar() {
      if (!boss) return;
      const pct = Math.max(0, boss.hp / boss.maxHp);
      bossHpInner.style.width = (pct * 100) + '%';
  }

  function updateBoss(delta) {
    if (!boss) return;

    const dt = delta / 16;

    // ---- ENTRY PHASE ----
    if (!freezeGround) {
        boss.x += boss.vx * dt;

        // Freeze ground at arena
        if (boss.x <= boss.targetX) {
    boss.x = boss.targetX;
    freezeGround = true;

    groundSlowFactor = 1; // 🔥 lock current normal speed
    boss.vx = -2;
}     return;
    }

    // ---- FIRST FULL LEFT SWEEP ----
    if (!boss.hasReachedLeft) {
        boss.x += boss.vx * dt;

        if (boss.x <= 60) {
            boss.x = 60;
            boss.hasReachedLeft = true;
            boss.vx = 2; // now start normal patrol
        }
        return;
    }

    // ---- NORMAL PATROL (LEFT ↔ RIGHT) ----
    boss.x += boss.vx * dt;

    if (boss.x <= 60) {
        boss.x = 60;
        boss.vx = Math.abs(boss.vx);
    }

    if (boss.x + boss.w >= width - 60) {
        boss.x = width - boss.w - 60;
        boss.vx = -Math.abs(boss.vx);
    }

    // ---- COLLISION ----
    if (collides(player, boss)) {
        safePlay(audio3);
        safePlay(audio6);
        safeVibrate([200, 60, 200]);
        AUDIO_BOSS_WINS();
        endGame("U Can't Ever Defeat Modi Even In Game Also");
    }
}  function endGame(message) {
    cancelJumpHint(); // 🔥 INSTANT OVERRIDE

    running = false;
    gameOver = true;
    inBossPhase = false;
    bossIntro = false;
    allowObstacles = false;
    isPreBossFire = false;

    resetOverlayStyle(); // restore original look

    overlay.textContent = message;
    overlay.style.display = 'block';
    restartBtn.style.display = 'block';
    exitBtn.style.display = 'block';
}
  /* ------------------ BOSS DEFEAT SEQUENCE ------------------ */

  function fadeBackgroundImage(newImage) {
      document.body.style.opacity = "0";
      setTimeout(() => {
          document.body.style.backgroundImage = `url("${newImage}")`;
          document.body.style.opacity = "1";
      }, 100);
  }

  function handleBossDefeat() {
      AUDIO_CHARACTER_WINS();
      safePlay(audio7);
      overlay.style.display = "none";

      running = false;
      gameOver = true;
      inBossPhase = false;

      scoreEl.style.display = 'none';
      bossHpBar.style.display = 'none';
      bossHpInner.style.display = 'none';
      pauseBtn.style.display = 'none';

      boss = null;

      overlay.style.whiteSpace = "normal";
      overlay.textContent = "You Make Didi As The New PM OF India";
      overlay.style.display = "block";

      setTimeout(() => {
          overlay.style.background = "rgba(0,0,0,0.92)";
          overlay.style.color = "#fffce8";
          overlay.style.textShadow = "0 0 10px rgba(255,200,80,1), 0 0 22px rgba(255,120,0,1)";
          overlay.style.whiteSpace = "normal";
          overlay.style.fontWeight = "900";
          overlay.style.letterSpacing = "1px";
          overlay.style.border = "2px solid rgba(255,120,0,1)";
          overlay.style.zIndex = "999999999999";
          overlay.style.boxShadow = "0 0 20px rgba(255,140,0,1)";
          overlay.textContent = "A Terror Attack Taken Place";
          overlay.style.display = "block";

          safePlay(audio7);
          AUDIO_BLAST_START();
          safeVibrate([
              320, 70,
              320, 70,
              420, 110,
              200
          ]);

          document.body.classList.add("shake-screen");
          setTimeout(() => {
              document.body.classList.remove("shake-screen");
          }, 400);

          blastOverlay.style.display = 'block';
          requestAnimationFrame(() => {
              blastOverlay.style.opacity = '1';
          });

          fadeBackgroundImage("background1.jpg");

          setTimeout(() => {
              blastOverlay.style.opacity = '0';
              overlay.style.display = "none";

              setTimeout(() => {
                  blastOverlay.style.display = 'none';

                  overlay.style.display = "block";
                  overlay.style.background = "rgba(0,0,0,0.65)";
                  overlay.style.color = "#fff";
                  overlay.style.textShadow = "none";
                  overlay.style.border = "none";
                  overlay.style.boxShadow = "none";
                  overlay.style.letterSpacing = "0px";
                  overlay.style.fontWeight = "600";
                  overlay.style.zIndex = "999";
                  overlay.textContent = "Didi's Vote Bank Has Destroyed India";

                  restartBtn.style.display = 'block';
                  exitBtn.style.display = 'block';
                  AUDIO_AFTER_BLAST_MESSAGE();
              }, 1000);
          }, 3000);
      }, 12000);
  }

  /* ------------------ BOSS INTRO SEQUENCE ------------------ */

  function startBossSequence() {
      if (bossIntro || inBossPhase || gameOver) return;

      bossIntro = true;
      allowObstacles = false;
      isPreBossFire = true;
      spawnTimer = Infinity;

      AUDIO_BOSS_WARNING();

      overlay.textContent = "PM Narendra Modi Is Coming";
      overlay.style.display = "block";

      setTimeout(() => {
          function waitUntilClear() {
              if (gameOver) return;

              if (obstacles.length === 0) {
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

  function autoFire(delta) {
      if (gameOver) return;
      fireTimer += delta;
      if ((isPreBossFire || inBossPhase) && fireTimer >= FIRE_INTERVAL) {
          fireTimer = 0;
          spawnPlayerBullet();
      }
  }

  /* ------------------ OBSTACLE UPDATE ------------------ */

  function updateObstacles(delta) {
      const move = gameSpeed * (delta / 16);
      for (let i = obstacles.length - 1; i >= 0; i--) {
          obstacles[i].x -= move;
          if (obstacles[i].x + obstacles[i].w < -50) {
              obstacles.splice(i, 1);
          }
      }
  }

  /* ------------------ FULLSCREEN BUTTON (WEB ONLY) ------------------ */

  if (fsBtn) {
      fsBtn.addEventListener("click", () => {
          if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(() => {});
              fsBtn.textContent = "⤢";
          } else {
              document.exitFullscreen();
              fsBtn.textContent = "⛶";
          }
      });

      document.addEventListener("fullscreenchange", () => {
          fsBtn.textContent = document.fullscreenElement ? "⤢" : "⛶";
      });
  }

  /* ------------------ MAIN LOOP ------------------ */

  function update(now) {

      const delta = now - lastTime;
      lastTime = now;
      
      if (
          canvas.width !== Math.floor(width * deviceRatio) ||
          canvas.height !== Math.floor(height * deviceRatio)
      ) {
          canvas.width = Math.floor(width * deviceRatio);
          canvas.height = Math.floor(height * deviceRatio);
          ctx.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0);
      }

 ctx.clearRect(0, 0, width, height);
 
// ---- SKY PARALLAX (slow & smooth) ----
const SKY_TARGET_SCORE = 250;

if (!gameOver && score < SKY_TARGET_SCORE) {
    const progress = score / SKY_TARGET_SCORE; // 0 → 1
    skyOffset = -progress * width;             // exactly one full cycle
}


drawSky();

// ---- Ground scrolling (smooth stop) ----
if (running && !paused && !gameOver) {

    if (freezeGround) {
        // ease out ground speed
        groundSlowFactor *= 0.92;
        if (groundSlowFactor < 0.02) {
            groundSlowFactor = 0;
        }
    }

    const speed = gameSpeed * groundSlowFactor;

    if (speed > 0) {
        groundOffset -= speed * (delta / 16);

        if (groundOffset <= -width) {
            groundOffset = 0;
        }
    }
}
drawGround();

      if (running && !paused && !gameOver) {
          if (allowObstacles) {
              spawnTimer += delta;
              const interval = Math.max(700, spawnInterval - gameSpeed * 25);
              if (spawnTimer > interval + Math.random() * 300) {
                  spawnTimer = 0;
                  spawnObstacle();
              }
          }

          updatePlayer(delta);
          updateObstacles(delta);
          updateBullets(delta);
          updateExplosions(performance.now());
          updateDust(performance.now());
          autoFire(delta);

          if (!inBossPhase && Math.floor(score) >= BOSS_SCORE_THRESHOLD) {
              startBossSequence();
          }

          if (inBossPhase) {
              updateBoss(delta);
          }

          if (!inBossPhase) {
              checkObstacleCollisions();
          }

          score += delta * 0.01;
          updateScoreDisplay();
      } else {
          updateExplosions(performance.now());
          updateDust(performance.now());
          return;
      }

      drawDust();
      drawObstacles();
      drawBullets();
      drawPlayer();
      drawBoss();
      drawExplosions();
  }

  function loop(now) {
    if (!running && !paused && gameOver) {
        rafId = null;
        return;
    }

    rafId = requestAnimationFrame(loop);
    update(now);
}
let hintRemaining = 5000; // total duration
let hintStartTime = 0;
function showJumpHint() {
    cancelJumpHint(false); // do NOT reset remaining time

    hintActive = true;
    hintStartTime = performance.now();

    overlay.textContent = "Touch / Click to Jump";
    overlay.style.display = "block";

    overlay.style.background = "rgba(0,0,0,0)";
    overlay.style.color = "rgba(0,0,0,0.8)";
    overlay.style.fontWeight = "800";
    overlay.style.textShadow = "0 0 10px rgba(255,255,255,0.5)";
    overlay.style.pointerEvents = "none";

    overlay.style.transition = "opacity 0.4s ease";
    overlay.style.opacity = "1";

    hintTimeout = setTimeout(() => {
        overlay.style.opacity = "0";

        hintFadeTimeout = setTimeout(() => {
            cancelJumpHint(true); // full reset
        }, 600);

    }, hintRemaining);
}
function cancelJumpHint(reset = true) {
    if (!hintActive) return;

    clearTimeout(hintTimeout);
    clearTimeout(hintFadeTimeout);

    // 🔥 preserve remaining time if pausing
    if (!reset) {
        const elapsed = performance.now() - hintStartTime;
        hintRemaining = Math.max(0, hintRemaining - elapsed);
    } else {
        hintRemaining = 5000; // reset fully
    }

    hintTimeout = null;
    hintFadeTimeout = null;
    hintActive = false;

    overlay.style.display = "none";
    overlay.style.opacity = "1";
    overlay.style.transition = "";
    overlay.style.pointerEvents = "";

    resetOverlayStyle();
}
function resetOverlayStyle() {
    overlay.style.background = "";
    overlay.style.color = "";
    overlay.style.fontWeight = "";
    overlay.style.textShadow = "";
    overlay.style.letterSpacing = "";
    overlay.style.pointerEvents = "";
    overlay.style.transition = "";
    overlay.style.opacity = "1";
}
  /* ------------------ INPUT HANDLING ------------------ */

  function onUserGestureStart() {
      userGestureDone = true;

      audio9.volume = 0;
      safePlay(audio9);
      audio9.pause();
      audio9.currentTime = 0;
      
      if(!paused && running){
    safePlay(audio1);
}
      if (!started) {
    started = true;
    running = true;
    overlay.style.display = 'none';
    lastTime = performance.now();
    AUDIO_START_GAMEPLAY();

    // show hint after start
    showJumpHint();

    return;
}
      if (paused) return;
      if (gameOver) return;

      jump();
  }

  function onKeyDown(e) {
      if (gameOver && e.code === "Space") init(true);
      if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
          e.preventDefault();
          onUserGestureStart();
          return;
      }
      if (e.code === 'KeyP') {
          if (running) togglePause(!paused);
      }
  }

  let touchStartY = null;
  const SWIPE_MIN_DIST = 20;

  function onTouchStart(e) {
      if (e.touches && e.touches.length) {
          touchStartY = e.touches[0].clientY;
      }
      onUserGestureStart();
  }

  function onTouchMove(e) {
      if (!touchStartY || !e.touches || !e.touches.length) return;
      const dy = touchStartY - e.touches[0].clientY;
      if (dy > SWIPE_MIN_DIST) {
          jump();
          touchStartY = null;
      }
  }

  function onTouchEnd() {
      touchStartY = null;
  }
  /* ------------------ UI BUTTON BINDINGS ------------------ */

  pauseBtn.addEventListener('click', () => {
      if (!started) return;
      togglePause(!paused);
  });

  resumeBtn.addEventListener('click', () => {
      if (!started) return;
      togglePause(false);
  });

  restartGameBtn.addEventListener('click', () => {
      stopAllAudio();
      init(true);
  });

  exitGameBtn.addEventListener('click', () => {
      stopAllAudio();
      exitGame();
  });

  restartBtn.addEventListener('click', () => {
      AUDIO_RESTART();
      init(true);
  });

  exitBtn.addEventListener('click', () => {
      stopAllAudio();
      exitGame();
  });

  /* ------------------ EXIT GAME (APK vs WEB) ------------------ */

  function exitGame() {
      stopAllAudio();

      if (isBrowser) {
          // Web: clear login and go back
          localStorage.removeItem("login");
          window.location.replace("index.html");
          return;
          }

      // APK: no real close from JS → go back to main page
      window.location.replace("index.html");
  }
if (isBrowser) {
    history.pushState({ panel: false }, "");

    window.addEventListener("popstate", () => {
        if (panelOpened) {
            closeSlidePanel();
            history.pushState({ panel: false }, "");
        } else {
            localStorage.removeItem("login");
            location.replace("index.html");
        }
    });
}
  /* ------------------ EVENT LISTENERS ------------------ */

  canvas.addEventListener('pointerdown', onUserGestureStart);
  canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      onTouchStart(e);
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
      onTouchMove(e);
  }, { passive: true });

  canvas.addEventListener('touchend', onTouchEnd, { passive: true });
  window.addEventListener('keydown', onKeyDown);

  window.addEventListener('resize', () => {
      resize();
      if (started && !gameOver) {
          paused = true;
          pauseMenu.style.display = 'block';
          pauseMenu.setAttribute('aria-hidden', 'false');
          overlay.style.display = 'none';
          try { audio1.pause(); } catch (e) {}
          running = true;
      }
  });

  window.addEventListener('focus', () => {
      lastTime = performance.now();
  });

  /* ------------------ ASSET PRELOAD THEN INIT ------------------ */

  const assets = [
      new Promise(r => { bgImg.onload = r; bgImg.onerror = r; setTimeout(r, 1200); }),
      new Promise(r => { groundImg.onload = r; groundImg.onerror = r; setTimeout(r, 1200); }),
      new Promise(r => { playerImg.onload = r; playerImg.onerror = r; setTimeout(r, 1200); }),
      new Promise(r => { obstacleImg.onload = r; obstacleImg.onerror = r; setTimeout(r, 1200); }),
      new Promise(r => { bossImg.onload = r; bossImg.onerror = r; setTimeout(r, 1200); }),
      new Promise(r => { bulletImg.onload = r; bulletImg.onerror = r; setTimeout(r, 1200); }),
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


  Promise.all(assets).then(() => {

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {

            init(true);

            requestAnimationFrame((t) => {
                lastTime = t;
                update(t);
            });

            if (!rafId) {
                rafId = requestAnimationFrame(loop);
            }

            // 🔥 FINAL FIX: show popup AFTER game exists
            if (window.__SHOW_VIB_POPUP__) {
                setTimeout(showVibrationPopup, 100);
                window.__SHOW_VIB_POPUP__ = false;
            }

        });
    });
}); 

 /* ------------------ INSTAGRAM HEADER CLICK ------------------ */

  const INSTAGRAM_USERNAME = "#";
  const INSTAGRAM_URL = `#`;

  if (topHeader) {
      topHeader.addEventListener("click", () => {
          const win = window.open(INSTAGRAM_URL, "_blank");
          if (!win) location.href = INSTAGRAM_URL;
      });
  }
    // ===== AUTO EXIT AFTER 2 MINUTES HIDDEN =====
const AUTO_EXIT_DELAY = 2 * 60 * 1000;
const HIDDEN_KEY = "hiddenAt";

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        localStorage.setItem(HIDDEN_KEY, Date.now());

        stopAllAudio();

        if (running && !paused) {
            paused = true;
            pauseMenu.style.display = "block";
        }

        // close slide panel safely
        if (panelOpened) {
            closeSlidePanel();
        }

    } else {
        const hiddenAt = Number(localStorage.getItem(HIDDEN_KEY));
        localStorage.removeItem(HIDDEN_KEY);

        if (hiddenAt && Date.now() - hiddenAt >= AUTO_EXIT_DELAY) {
            stopAllAudio();
            localStorage.removeItem("login");
            location.replace("index.html");
            return;
        }

        lastTime = performance.now();
    }
});
})(); // end IIFE

function closeSlidePanel() {
    slidePanel.classList.remove("open");
    panelOpened = false;
}

let panelOpened = false;

const slidePanel = document.getElementById("slidePanel");
const slideTab = document.getElementById("slideTab");
const slideContent = document.getElementById("slideContent");

const redirectURL = "contact.html";

// TAB CLICK → open/close ONLY
slideTab.addEventListener("click", (e) => {
    e.stopPropagation();

    if (panelOpened) {
        closeSlidePanel();
    } else {
        slidePanel.classList.add("open");
        panelOpened = true;
    }
});
document.addEventListener("click", () => {
    if (panelOpened) {
        closeSlidePanel();
    }
});
slidePanel.addEventListener("click", (e) => {
    e.stopPropagation();
});
slideContent.addEventListener("click", () => {
    if (!panelOpened) return;

    closeSlidePanel();
    window.location.href = redirectURL;
});

// CONTENT CLICK → redirect ONLY when open
slideContent.addEventListener("click", () => {
    if (panelOpened) {
        window.location.href = redirectURL;
    }
});    