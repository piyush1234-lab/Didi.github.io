// --- Platform Detection (Capacitor/Android) ---
const isAndroid = (() => {
    try {
        if (window.Capacitor && Capacitor.getPlatform) {
            return Capacitor.getPlatform() === "android";
        }
    } catch(e) {}
    return /android|capacitor/i.test(navigator.userAgent);
})();
document.addEventListener("DOMContentLoaded", () => {
    // Show fake loading progress until full page load
    let fakePercent = 0;
    const fill = document.getElementById("loadFill");
    const percentTxt = document.getElementById("loadPercent");
    const fake = setInterval(() => {
        fakePercent += Math.random() * 7;
        if (fakePercent > 90) fakePercent = 90;
        fill.style.width = fakePercent + "%";
        percentTxt.textContent = Math.round(fakePercent) + "%";
    }, 200);

    window.addEventListener("load", () => {
        clearInterval(fake);
        fill.style.width = "100%";
        percentTxt.textContent = "100%";
        // Hide loader after a short delay
        setTimeout(() => {
            const loader = document.getElementById("loader");
            loader.style.opacity = "0";
            setTimeout(() => {
                loader.style.display = "none";
            }, 700);
        }, 300);
    });
});

// --- Game Code (wrapped in IIFE to avoid globals) ---
(() => {
    // Check login status (web only)
    if (!isAndroid) {
        const loginStatus = localStorage.getItem("login");
        if (loginStatus !== "true") {
            window.location.href = "index.html";
        }
    }

    // UI elements
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
    
    // Images
    const groundImg = new Image(); groundImg.src = "ground.jpg";
    const playerImg = new Image(); playerImg.src = "character.png";
    const obstacleImg = new Image(); obstacleImg.src = "obstacle.png";
    const bossImg = new Image(); bossImg.src = "boss_monster.jpeg";
    const bulletImg = new Image(); bulletImg.src = "bullet.png";

    // Audio (AudioElement.volume ranges 0.0–1.07)
    const audio1 = new Audio("audio1.mp3"); // background music
    audio1.loop = true; audio1.volume = 0.05;
    const audio2 = new Audio("audio2.wav"); // jump
    const audio3 = new Audio("audio3.wav"); // hit obstacle
    const audio4 = new Audio("audio4.mp3"); audio4.loop = false; audio4.volume = 1; // boss warning
    const audio5 = new Audio("audio5.mp3"); audio5.loop = true; // boss fight
    const audio6 = new Audio("audio6.mp3"); // boss wins
    const audio7 = new Audio("audio7.mp3"); // character wins
    const audio8 = new Audio("audio8.mp3"); audio8.loop = true; // blast ambience
    const audio9 = new Audio("audio9.mp3"); audio9.loop = true; // post-blast calm
    
    // Safe audio playback (uses Promise from play(), catches errors)8
    function safePlay(audio) {
        const p = audio.play();
        if (p && p.catch) p.catch(() => {});
    }

    function safeVibrate(pattern) {
        try {
            if (isAndroid && window.Android && typeof Android.vibrate === "function") {
                Android.vibrate(pattern.toString());
                return;
            }
        } catch(e) {}
        if (navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    }

    // Audio volume adjustments
    function smoothVolume(audio, target, speed = 0.03) {
        clearInterval(audio._fade);
        audio._fade = setInterval(() => {
            if (Math.abs(audio.volume - target) < 0.03) {
                audio.volume = target;
                clearInterval(audio._fade);
            } else if (audio.volume < target) {
                audio.volume = Math.min(1, audio.volume + speed);
            } else {
                audio.volume = Math.max(0, audio.volume - speed);
            }
        }, 60);
    }
    function rapidFadeOut(audio) {
        clearInterval(audio._fade);
        audio._fade = setInterval(() => {
            audio.volume = Math.max(0, audio.volume - 0.15);  // fade faster
            if (audio.volume <= 0) {
                audio.pause();
                audio.volume = 0;
                clearInterval(audio._fade);
            }
        }, 50);
    }
    function stopAllAudio() {
        // Stops all audio elements (we call this on restart)
        [audio1,audio2,audio3,audio4,audio5,audio6,audio7,audio8,audio9].forEach(a => {
            try {
                a.pause();
                a.currentTime = 0;
            } catch (e) {}
        });
    }

    // Timeline audio triggers
    function AUDIO_START_GAMEPLAY() {
        audio1.currentTime = 0; audio1.volume = 0.05; safePlay(audio1);
    }
    function AUDIO_BOSS_WARNING() {
        smoothVolume(audio1, 0.12);
        audio4.currentTime = 0; safePlay(audio4);
    }
    function AUDIO_BOSS_FIGHT() {
        smoothVolume(audio1, 0.07);
        audio5.currentTime = 0; safePlay(audio5);
    }
    function AUDIO_BOSS_WINS() {
        audio4.pause(); audio4.currentTime = 0;
        audio5.pause(); audio5.currentTime = 0;
        rapidFadeOut(audio1);
        audio6.currentTime = 0; safePlay(audio6);
    }
    function AUDIO_CHARACTER_WINS() {
        audio4.pause(); audio4.currentTime = 0;
        audio5.pause(); audio5.currentTime = 0;
        rapidFadeOut(audio1);
        audio7.currentTime = 0; safePlay(audio7);
    }
    function AUDIO_BLAST_START() {
        audio8.currentTime = 0; safePlay(audio8);
    }
    function AUDIO_AFTER_BLAST_MESSAGE() {
        audio8.pause(); audio8.currentTime = 0;
        audio9.currentTime = 0; audio9.volume = 0.6; safePlay(audio9);
    }
    function AUDIO_RESTART() {
        stopAllAudio();
        audio1.currentTime = 0; audio1.volume = 0.05; safePlay(audio1);
    }

    // Game state variables
    let width = innerWidth, height = innerHeight;
    let deviceRatio = Math.max(1, window.devicePixelRatio || 1);
    let visualScale = 1, groundHeight = 90;
    let running = false, paused = false, started = false, userGestureDone = false;
    let score = 0, lastTime = performance.now(), rafId = null;
    let player = null, obstacles = [], bullets = [], explosions = [], dustParticles = [];
    let spawnTimer = 0, spawnInterval = 1300, gameSpeed = 4;
    let fireTimer = 0, isPreBossFire = false;
    let BOSS_SCORE_THRESHOLD = 250; // adjust as needed
    let boss = null, bossIntro = false, inBossPhase = false, allowObstacles = true;
    let gameOver = false;

    // Utility: ground Y position
    function getGroundY() {
        return height - groundHeight;
    }

    // Spawn a dust particle at (x,y)
    function spawnDust(x, y) {
        const angle = (Math.random() * 0.6) - 0.3;
        dustParticles.push({
            x: x,
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

    // Resize canvas on window resize
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
            if (player.y + player.h > gY) {
                player.y = gY - player.h; player.vy = 0; player.grounded = true;
            }
        }
        // Adjust obstacles to new ground if needed
        for (let ob of obstacles) {
            const oldH = ob.h;
            ob.w = Math.max(28, 40 * visualScale * (width < height ? 1 : 0.9));
            const MAX_H = 80 * visualScale;
            const MIN_H = 35 * visualScale;
            ob.h = MIN_H + Math.random() * (MAX_H - MIN_H);
            ob.y = getGroundY() - ob.h;
        }
    }

    const bgImg = new Image();
    bgImg.src = "background.png"; // not used in draw (maybe for backgroundImage)

    // Initialize or restart game
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
        obstacles = []; bullets = []; explosions = []; dustParticles = [];
        spawnTimer = 0; spawnInterval = 1300; gameSpeed = 4;
        fireTimer = 0; isPreBossFire = false;
        score = 0; running = false; paused = false; started = false; userGestureDone = false;
        boss = null; bossIntro = false; inBossPhase = false; allowObstacles = true;
        gameOver = false;
        overlay.textContent = "Tap / Click / Press Space to start";
        document.body.style.backgroundImage = 'url(background.jpg)';
        overlay.style.display = "block";
        pauseMenu.style.display = "none";
        restartBtn.style.display = "none";
        exitBtn.style.display = "none";
        bossHpBar.style.display = "none";
        pauseBtn.style.display = "block";
        blastOverlay.style.display = "none";
        blastOverlay.style.opacity = '0';
        scoreEl.style.display = 'block';
        updateScoreDisplay();
        if (!rafId) rafId = requestAnimationFrame(loop);
    }

    // Spawn an obstacle
    function spawnObstacle() {
        if (!allowObstacles) return;
        const w = Math.max(28, 40 * visualScale * (width < height ? 1 : 0.9));
        const MAX_H = 80 * visualScale;
        const MIN_H = 35 * visualScale;
        const h = MIN_H + Math.random() * (MAX_H - MIN_H);
        obstacles.push({
            x: width + w + 10,
            y: getGroundY() - h,
            w: w, h: h
        });
        gameSpeed = Math.min(14, gameSpeed + 0.1);
        spawnInterval = Math.max(500, spawnInterval - 0.5);
    }

    // Collision detection (axis-aligned bounding boxes)
    function collides(a, b) {
        return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
    }

    // Player jump
    function jump() {
        if (!running || paused || gameOver) return;
        if (player.grounded) {
            player.vy = -player.jumpPower;
            player.grounded = false;
            safePlay(audio2);
        }
    }

    // Update player physics
    function updatePlayer(delta) {
        const dt = Math.min(delta, 32) / 16;
        player.vy += player.gravity * dt;
        player.y += player.vy * dt;
        const ground = getGroundY();
        if (player.y + player.h >= ground) {
            if (!player.grounded) {
                // Spawn dust on landing
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

    // Spawn a bullet (football) from player
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

    // Update bullets (move & check boss hit)
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

    // Explosion effect
    function spawnExplosion(x, y, maxR = 60, dur = 700) {
        explosions.push({ x, y, start: performance.now(), duration: dur, maxR, r: 0 });
    }
    function updateExplosions(now) {
        for (let i = explosions.length - 1; i >= 0; i--) {
            const ex = explosions[i];
            const t = (now - ex.start) / ex.duration;
            if (t >= 1) { explosions.splice(i, 1); continue; }
            ex.r = Math.max(0, ex.maxR * t);
        }
    }

    // Draw functions
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
            // Three overlapping ellipses to simulate dust cloud
            ctx.ellipse(p.x, p.y, size * 1.2, size * 0.6, 0, 0, 2 * Math.PI);
            ctx.ellipse(p.x - size * 0.6, p.y + size * 0.2, size * 0.9, size * 0.45, 0, 0, 2 * Math.PI);
            ctx.ellipse(p.x + size * 0.6, p.y + size * 0.15, size * 0.95, size * 0.55, 0, 0, 2 * Math.PI);
            ctx.ellipse(p.x, p.y, size * (1.1 + Math.sin(p.shapeOffset)*0.15), size * 0.6, 0, 0, 2 * Math.PI);
            ctx.fill();
            ctx.restore();
        }
    }
    function drawGround() {
        if (groundImg.complete && groundImg.naturalWidth) {
            ctx.drawImage(groundImg, 0, getGroundY(), width, groundHeight);
        } else {
            ctx.fillStyle = "#2b7a2b";
            ctx.fillRect(0, getGroundY(), width, groundHeight);
        }
    }
    function drawPlayer() {
        if (playerImg.complete && playerImg.naturalWidth) {
            ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);
        } else {
            ctx.fillStyle = "#ffd166";
            ctx.fillRect(player.x, player.y, player.w, player.h);
        }
    }
    function drawObstacles() {
        for (const ob of obstacles) {
            if (obstacleImg.complete && obstacleImg.naturalWidth) {
                ctx.drawImage(obstacleImg, ob.x, ob.y, ob.w, ob.h);
            } else {
                ctx.fillStyle = "#8b5e3c";
                ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
            }
        }
    }
    function drawBullets() {
        for (const b of bullets) {
            if (bulletImg.complete && bulletImg.naturalWidth) {
                ctx.drawImage(bulletImg, b.x, b.y, b.w, b.h);
            } else {
                ctx.fillStyle = "#fff";
                ctx.fillRect(b.x, b.y, b.w, b.h);
            }
        }
    }
    function drawBoss() {
        if (!boss) return;
        if (bossImg.complete && bossImg.naturalWidth) {
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

    // Score display (uses floor of score)
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

    // Boss spawning and logic
    function spawnBoss() {
        const w = 90 * visualScale;
        const h = 80 * visualScale;
        boss = { x: width + 50, y: getGroundY() - h, w, h, vx: -2, hp: 200, maxHp: 200 };
        bossHpBar.style.display = 'block';
        updateBossHpBar();
        // Shift player back a bit for room
        const targetX = Math.min(width - player.w - 140 * visualScale, player.x + 290 * visualScale);
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
        boss.x += boss.vx * (delta / 16);
        if (boss.x < 60) boss.vx = Math.abs(boss.vx);
        if (boss.x + boss.w > width - 60) boss.vx = -Math.abs(boss.vx);
        if (collides(player, boss)) {
            safePlay(audio3); safePlay(audio6); safeVibrate([200, 60, 200]);
            AUDIO_BOSS_WINS();
            endGame("Boss Defeated You!");
        }
    }

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

    // Handle boss defeat sequence
    function fadeBackgroundImage(newImage) {
        document.body.style.opacity = "0";
        setTimeout(() => {
            document.body.style.backgroundImage = `url("${newImage}")`;
            document.body.style.opacity = "1";
        }, 100);
    }
    function handleBossDefeat() {
        AUDIO_CHARACTER_WINS();
        overlay.style.display = 'none';
        running = false; gameOver = true; inBossPhase = false;
        boss = null;
        scoreEl.style.display = 'none';
        bossHpBar.style.display = 'none';
        pauseBtn.style.display = 'none';

        // First message
        overlay.style.background = "rgba(0,0,0,0.65)";
        overlay.style.color = "#fff";
        overlay.style.textShadow = "none";
        overlay.style.whiteSpace = "normal";
        overlay.style.fontWeight = "600";
        overlay.style.letterSpacing = "0px";
        overlay.style.border = "none";
        overlay.style.boxShadow = "none";
        overlay.style.zIndex = "999";
        overlay.textContent = "You Make Didi As The New PM OF India";
        overlay.style.display = "block";

        // After delay, show blast message
        setTimeout(() => {
            // Style changes for blast message
            overlay.style.background = "rgba(0,0,0,0.92)";
            overlay.style.color = "#fffce8";
            overlay.style.textShadow = "0 0 10px rgba(255,200,80,1), 0 0 22px rgba(255,120,0,1)";
            overlay.style.fontWeight = "900";
            overlay.style.letterSpacing = "1px";
            overlay.style.border = "2px solid rgba(255,120,0,1)";
            overlay.style.boxShadow = "0 0 20px rgba(255,140,0,1)";
            overlay.style.zIndex = "999999999999";
            overlay.textContent = "YOUR MESSAGE 2";
            overlay.style.display = "block";
            safePlay(audio7);
            AUDIO_BLAST_START();
            safeVibrate([
                320, 70, 320, 70, 420, 110, 200
            ]);
            document.body.classList.add("shake-screen");
            setTimeout(() => {
                document.body.classList.remove("shake-screen");
            }, 400);
            blastOverlay.style.display = 'block';
            requestAnimationFrame(() => {
                blastOverlay.style.opacity = '1';
            });
            fadeBackgroundImage("../assets/background1.jpg");

            // Fade out blast overlay
            setTimeout(() => {
                blastOverlay.style.opacity = '0';
                overlay.style.display = "none";
                setTimeout(() => {
                    blastOverlay.style.display = 'none';
                    // Final message after blast
                    overlay.style.background = "rgba(0,0,0,0.65)";
                    overlay.style.color = "#fff";
                    overlay.style.textShadow = "none";
                    overlay.style.letterSpacing = "0px";
                    overlay.style.fontWeight = "600";
                    overlay.style.boxShadow = "none";
                    overlay.style.border = "none";
                    overlay.style.zIndex = "999";
                    overlay.textContent = "YOUR MESSAGE 3";
                    overlay.style.display = "block";
                    restartBtn.style.display = 'block';
                    exitBtn.style.display = 'block';
                    AUDIO_AFTER_BLAST_MESSAGE();
                }, 1000);
            }, 1500);
        }, 2500);
    }

    // Sequence to introduce boss
    function startBossSequence() {
        if (bossIntro || inBossPhase || gameOver) return;
        bossIntro = true; allowObstacles = false; isPreBossFire = true; spawnTimer = Infinity;
        AUDIO_BOSS_WARNING();
        overlay.textContent = "PM Narendra Modi Is Coming";
        overlay.style.display = "block";
        setTimeout(() => {
            const waitUntilClear = () => {
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
            };
            requestAnimationFrame(waitUntilClear);
        }, 2000);
    }

    // Auto-fire bullets during boss phases
    function autoFire(delta) {
        if (gameOver) return;
        fireTimer += delta;
        if ((isPreBossFire || inBossPhase) && fireTimer >= FIRE_INTERVAL) {
            fireTimer = 0;
            spawnPlayerBullet();
        }
    }
    const FIRE_INTERVAL = 500;

    // Update dust particles
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
            p.vy += 0.02; // gravity
            p.r *= p.shrink;
        }
    }

    // Obstacle movement
    function updateObstacles(delta) {
        const move = gameSpeed * (delta / 16);
        for (let i = obstacles.length - 1; i >= 0; i--) {
            obstacles[i].x -= move;
            if (obstacles[i].x + obstacles[i].w < -50) {
                obstacles.splice(i, 1);
            }
        }
    }

    // Pause button handling
    fsBtn.addEventListener("click", () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
            fsBtn.textContent = "⤢";
        } else {
            document.exitFullscreen();
            fsBtn.textContent = "⛶";
        }
    });

    // Main game loop
    function update(now) {
        rafId = requestAnimationFrame(loop);
        const delta = now - lastTime;
        lastTime = now;

        // Resize check
        if (canvas.width !== Math.floor(width * deviceRatio) || canvas.height !== Math.floor(height * deviceRatio)) {
            canvas.width = Math.floor(width * deviceRatio);
            canvas.height = Math.floor(height * deviceRatio);
            ctx.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0);
        }

        // Clear frame
        ctx.clearRect(0, 0, width, height);
        drawGround();

        if (running && !paused && !gameOver) {
            // Spawn obstacles if allowed
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
            } else {
                checkObstacleCollisions();
            }

            score += delta * 0.01;
            updateScoreDisplay();
        } else {
            // Even if paused or before start, update dust for visuals
            updateDust(performance.now());
            return;
        }

        // Draw entities
        drawDust();
        drawObstacles();
        drawBullets();
        drawPlayer();
        drawBoss();
        drawExplosions();
    }
    function loop(now) {
        update(now);
    }

    // Input handling
    function onUserGestureStart() {
        userGestureDone = true;
        // Unlock audio on first touch
        audio9.volume = 0;
        safePlay(audio9); audio9.pause(); audio9.currentTime = 0;
        safePlay(audio1);

        if (!started) {
            started = true;
            running = true;
            overlay.style.display = 'none';
            lastTime = performance.now();
            AUDIO_START_GAMEPLAY();
            return;
        }
        if (paused || gameOver) return;
        jump();
    }
    function onKeyDown(e) {
        if (gameOver && e.code === "Space") init(true);
        if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
            e.preventDefault();
            onUserGestureStart();
            return;
        }
        if (e.code === 'KeyP' && started) {
            togglePause(!paused);
        }
    }
    let touchStartY = null;
    const SWIPE_MIN_DIST = 20;
    function onTouchStart(e) {
        if (e.touches && e.touches.length) touchStartY = e.touches[0].clientY;
        onUserGestureStart();
    }
    function onTouchMove(e) {
        if (touchStartY === null || !e.touches || !e.touches.length) return;
        const dy = touchStartY - e.touches[0].clientY;
        if (dy > SWIPE_MIN_DIST) {
            jump();
            touchStartY = null;
        }
    }
    function onTouchEnd() {
        touchStartY = null;
    }

    function togglePause(show) {
        if (gameOver) return;
        paused = show;
        pauseMenu.style.display = show ? 'block' : 'none';
        pauseMenu.setAttribute('aria-hidden', String(!show));
        if (show) {
            audio1.pause();
            overlay.style.display = 'none';
        } else {
            overlay.style.display = 'none';
            if (userGestureDone) safePlay(audio1);
            lastTime = performance.now();
        }
    }

    // UI button bindings
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

    function exitGame() {
        stopAllAudio();
        if (!isAndroid) {
            localStorage.removeItem("login");
        }
        if (isAndroid) {
            try {
                if (typeof Android.exitApp === "function") {
                    Android.exitApp();
                    return;
                }
                if (typeof Android.closeApp === "function") {
                    Android.closeApp();
                    return;
                }
            } catch(e) {}
        }
        window.location.href = "index.html";
    }

    canvas.addEventListener('pointerdown', onUserGestureStart);
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); onTouchStart(e); }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { onTouchMove(e); }, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', () => {
        resize();
        if (started && !gameOver) {
            paused = true;
            pauseMenu.style.display = 'block';
            pauseMenu.setAttribute('aria-hidden', 'false');
            overlay.style.display = 'none';
            try { audio1.pause(); } catch(e) {}
            running = true; // keep running so it resumes cleanly
        }
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && running && !paused) stopAllAudio();
        togglePause(true);
    });
    window.addEventListener('pagehide', () => {
        if (rafId) cancelAnimationFrame(rafId);
    });
    window.addEventListener('focus', () => {
        lastTime = performance.now();
    });

    // Preload assets then start
    const assets = [
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
    Promise.all(assets).then(() => init(true)).catch(() => init(true));

    // Fullscreen button icon update
    document.addEventListener("fullscreenchange", () => {
        fsBtn.textContent = document.fullscreenElement ? "⤢" : "⛶";
    });

    // Instagram link (optional, adjust username)
    const INSTAGRAM_URL = `https://www.instagram.com/piyush___editz__?igsh=...`;
    const isApp = (window.Android && typeof Android.openUrl === "function");
    topHeader.addEventListener("click", () => {
        if (isApp) {
            Android.openUrl(INSTAGRAM_URL);
        } else {
            const win = window.open(INSTAGRAM_URL, "_blank");
            if (!win) location.href = INSTAGRAM_URL;
        }
    });
})();