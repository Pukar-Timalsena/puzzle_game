// ========================================================
// Classic Turbo Car Racing Arcade
// ========================================================

(function () {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  function initRaceArcade() {
    const modal = document.getElementById("raceModal");
    const canvas = document.getElementById("raceCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const closeBtn = document.getElementById("closeRaceBtn");
    const restartBtn = document.getElementById("restartRaceBtn");
    const gameOverScreen = document.getElementById("raceGameOverScreen");
    const gameOverReason = document.getElementById("gameOverReason");
    const goScore = document.getElementById("goScore");

    const touchLeftBtn = document.getElementById("touchLeftBtn");
    const touchRightBtn = document.getElementById("touchRightBtn");

    // Track Geometry
    const ROAD_LEFT = 50;
    const ROAD_RIGHT = 310;
    const ROAD_WIDTH = ROAD_RIGHT - ROAD_LEFT; // 260px

    // State
    let isRunning = false;
    let isGameOver = false;
    let animId = null;

    let score = 0;
    let level = 1;
    let speed = 5.5;
    let roadY = 0;
    let particles = [];
    let speedLines = [];
    let startBannerTimer = 40;

    // Player car with smooth velocity physics
    const player = {
      x: 164,
      y: 400,
      w: 32,
      h: 56,
      vx: 0,
      accel: 1.1,
      maxVx: 5.5,
      friction: 0.82
    };

    // Opponent cars
    let opponents = [];
    let spawnTimer = 0;
    let spawnInterval = 75;

    const OPPONENT_COLORS = ["#06b6d4", "#ef4444", "#a855f7", "#10b981", "#f97316"];

    // Controls
    const keys = { left: false, right: false, up: false };

    window.addEventListener("keydown", (e) => {
      if (!isRunning || isGameOver) return;
      if (["ArrowLeft", "KeyA"].includes(e.code)) {
        keys.left = true;
        e.preventDefault();
      }
      if (["ArrowRight", "KeyD"].includes(e.code)) {
        keys.right = true;
        e.preventDefault();
      }
      if (["ArrowUp", "KeyW"].includes(e.code)) {
        keys.up = true;
        e.preventDefault();
      }
    });

    window.addEventListener("keyup", (e) => {
      if (["ArrowLeft", "KeyA"].includes(e.code)) keys.left = false;
      if (["ArrowRight", "KeyD"].includes(e.code)) keys.right = false;
      if (["ArrowUp", "KeyW"].includes(e.code)) keys.up = false;
    });

    // Touch controls for mobile
    function setupTouch(btn, prop) {
      if (!btn) return;
      ["touchstart", "mousedown"].forEach((evt) => {
        btn.addEventListener(evt, (e) => {
          e.preventDefault();
          keys[prop] = true;
        });
      });
      ["touchend", "mouseup", "mouseleave", "touchcancel"].forEach((evt) => {
        btn.addEventListener(evt, (e) => {
          e.preventDefault();
          keys[prop] = false;
        });
      });
    }

    setupTouch(touchLeftBtn, "left");
    setupTouch(touchRightBtn, "right");

    // Initialize speed lines
    for (let i = 0; i < 15; i++) {
      speedLines.push({
        x: ROAD_LEFT + Math.random() * ROAD_WIDTH,
        y: Math.random() * canvas.height,
        len: 15 + Math.random() * 25,
        s: 8 + Math.random() * 4
      });
    }

    function resetGame() {
      score = 0;
      level = 1;
      speed = 5.5;
      roadY = 0;
      startBannerTimer = 35;
      particles = [];
      opponents = [];
      spawnTimer = 0;
      spawnInterval = 75;

      player.x = 164;
      player.y = 400;
      player.vx = 0;

      keys.left = false;
      keys.right = false;
      keys.up = false;

      isGameOver = false;
      if (gameOverScreen) gameOverScreen.style.display = "none";
    }

    function spawnOpponent() {
      const lanes = [95, 180, 265];
      const laneX = lanes[Math.floor(Math.random() * lanes.length)] - 16;

      // Don't spawn on top of an existing opponent
      if (opponents.some((o) => o.y < 110 && Math.abs(o.x - laneX) < 25)) return;

      const color = OPPONENT_COLORS[Math.floor(Math.random() * OPPONENT_COLORS.length)];
      opponents.push({
        x: laneX,
        y: -65,
        w: 32,
        h: 56,
        color: color,
        speed: speed * (0.35 + Math.random() * 0.15)
      });
    }

    function drawRoad() {
      // Grass edges
      ctx.fillStyle = "#14532d";
      ctx.fillRect(0, 0, ROAD_LEFT, canvas.height);
      ctx.fillRect(ROAD_RIGHT, 0, canvas.width - ROAD_RIGHT, canvas.height);

      // Alternating red & white curbs (Track Sidelines!)
      const curbW = 7;
      const stripeH = 22;
      const offset = roadY % (stripeH * 2);

      for (let y = -stripeH * 2 + offset; y < canvas.height + stripeH; y += stripeH) {
        const isRed = Math.floor((y - offset) / stripeH) % 2 === 0;
        ctx.fillStyle = isRed ? "#ef4444" : "#ffffff";
        ctx.fillRect(ROAD_LEFT - curbW, y, curbW, stripeH);
        ctx.fillRect(ROAD_RIGHT, y, curbW, stripeH);
      }

      // Asphalt Track
      ctx.fillStyle = "#18181b";
      ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, canvas.height);

      // Sideline Border Lines (Crisp yellow lines)
      ctx.strokeStyle = "#eab308";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(ROAD_LEFT, 0);
      ctx.lineTo(ROAD_LEFT, canvas.height);
      ctx.moveTo(ROAD_RIGHT, 0);
      ctx.lineTo(ROAD_RIGHT, canvas.height);
      ctx.stroke();

      // Moving dashed lane dividers (2 white divider lines)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([18, 18]);
      ctx.lineDashOffset = -roadY;

      const laneW = ROAD_WIDTH / 3;
      ctx.beginPath();
      ctx.moveTo(ROAD_LEFT + laneW, 0);
      ctx.lineTo(ROAD_LEFT + laneW, canvas.height);
      ctx.moveTo(ROAD_LEFT + laneW * 2, 0);
      ctx.lineTo(ROAD_LEFT + laneW * 2, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function drawSpeedLines() {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = 1.5;
      speedLines.forEach((line) => {
        line.y += line.s + (keys.up ? 3 : 0);
        if (line.y > canvas.height) {
          line.y = -20;
          line.x = ROAD_LEFT + 5 + Math.random() * (ROAD_WIDTH - 10);
        }
        ctx.beginPath();
        ctx.moveTo(line.x, line.y);
        ctx.lineTo(line.x, line.y + line.len);
        ctx.stroke();
      });
    }

    function drawCar(car, isPlayer) {
      const { x, y, w, h } = car;

      // Exhaust turbo sparks for player
      if (isPlayer) {
        if (Math.random() < 0.6) {
          particles.push({
            x: x + 6 + Math.random() * (w - 12),
            y: y + h - 2,
            vy: 2 + Math.random() * 3,
            size: 2 + Math.random() * 3,
            life: 14
          });
        }
      }

      // Wheels
      ctx.fillStyle = "#09090b";
      ctx.fillRect(x - 2, y + 8, 3, 12);
      ctx.fillRect(x + w - 1, y + 8, 3, 12);
      ctx.fillRect(x - 2, y + h - 18, 3, 13);
      ctx.fillRect(x + w - 1, y + h - 18, 3, 13);

      // Body
      if (isPlayer) {
        // Red sports car body
        const grad = ctx.createLinearGradient(x, y, x + w, y);
        grad.addColorStop(0, "#dc2626");
        grad.addColorStop(0.5, "#ef4444");
        grad.addColorStop(1, "#b91c1c");
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = car.color;
      }

      ctx.beginPath();
      ctx.roundRect(x, y + 2, w, h - 4, 5);
      ctx.fill();

      // Front bumper curve
      ctx.beginPath();
      ctx.moveTo(x + 3, y + 2);
      ctx.lineTo(x + w / 2, y - 1);
      ctx.lineTo(x + w - 3, y + 2);
      ctx.closePath();
      ctx.fill();

      // Windshield & roof
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.roundRect(x + 4, y + 14, w - 8, 20, 3);
      ctx.fill();

      // Glass shine
      ctx.fillStyle = isPlayer ? "#38bdf8" : "#94a3b8";
      ctx.fillRect(x + 6, y + 15, 3, 8);

      // Lights
      if (isPlayer) {
        // Front headlights
        ctx.fillStyle = "#fef08a";
        ctx.fillRect(x + 3, y, 5, 2);
        ctx.fillRect(x + w - 8, y, 5, 2);

        // Rear brake lights
        ctx.fillStyle = keys.up ? "#f97316" : "#ef4444";
        ctx.fillRect(x + 3, y + h - 2, 5, 2);
        ctx.fillRect(x + w - 8, y + h - 2, 5, 2);
      } else {
        // Opponent headlights facing player
        ctx.fillStyle = "#fef08a";
        ctx.fillRect(x + 3, y + h - 2, 5, 2);
        ctx.fillRect(x + w - 8, y + h - 2, 5, 2);
      }
    }

    function drawParticles() {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.fillStyle = `rgba(251, 191, 36, ${p.life / 14})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawScoreHUD() {
      // Clean, minimal arcade score banner at top of canvas
      ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
      ctx.fillRect(0, 0, canvas.width, 36);

      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, monospace";
      ctx.textAlign = "left";
      ctx.fillText(`SCORE: ${Math.floor(score)}`, 14, 23);

      ctx.fillStyle = "#38bdf8";
      ctx.textAlign = "right";
      ctx.fillText(`LEVEL: ${level}`, canvas.width - 14, 23);

      // Start "GO!" flash banner
      if (startBannerTimer > 0) {
        startBannerTimer--;
        ctx.fillStyle = "#facc15";
        ctx.font = "bold 32px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("GO!", canvas.width / 2, 220);
      }
    }

    function checkCollision(p, o) {
      const pad = 4;
      return (
        p.x + pad < o.x + o.w - pad &&
        p.x + p.w - pad > o.x + pad &&
        p.y + pad < o.y + o.h - pad &&
        p.y + p.h - pad > o.y + pad
      );
    }

    function endGame(reason) {
      isGameOver = true;
      isRunning = false;
      cancelAnimationFrame(animId);

      if (gameOverReason) gameOverReason.textContent = reason;
      if (goScore) goScore.textContent = Math.floor(score);
      if (gameOverScreen) gameOverScreen.style.display = "flex";
    }

    function gameLoop() {
      if (!isRunning || isGameOver) return;

      const currentSpeed = keys.up ? speed * 1.3 : speed;
      roadY += currentSpeed;

      // Smooth horizontal steering physics
      if (keys.left) player.vx -= player.accel;
      if (keys.right) player.vx += player.accel;

      player.vx *= player.friction;
      if (player.vx > player.maxVx) player.vx = player.maxVx;
      if (player.vx < -player.maxVx) player.vx = -player.maxVx;

      player.x += player.vx;

      // ========================================================
      // TOUCH SIDE LINE = OUT!
      // ========================================================
      if (player.x <= ROAD_LEFT) {
        endGame("OUT! TOUCHED SIDE LINE");
        return;
      }
      if (player.x + player.w >= ROAD_RIGHT) {
        endGame("OUT! TOUCHED SIDE LINE");
        return;
      }

      // Score distance survival
      score += 0.25;

      // Level progression every 100 points
      const newLvl = 1 + Math.floor(score / 100);
      if (newLvl > level) {
        level = newLvl;
        speed = 5.5 + (level - 1) * 1.0;
        spawnInterval = Math.max(45, 75 - (level - 1) * 6);
      }

      // Spawn opponent vehicles
      spawnTimer++;
      if (spawnTimer >= spawnInterval) {
        spawnTimer = 0;
        spawnOpponent();
      }

      // Move opponents and check collision
      for (let i = opponents.length - 1; i >= 0; i--) {
        const obs = opponents[i];
        obs.y += currentSpeed - obs.speed;

        // Crash collision check
        if (checkCollision(player, obs)) {
          endGame("CRASH! HIT OPPONENT CAR");
          return;
        }

        // Passed safely
        if (obs.y > canvas.height + 60) {
          opponents.splice(i, 1);
          score += 15; // Bonus for dodging opponent
        }
      }

      // Render
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawRoad();
      drawSpeedLines();
      drawParticles();
      opponents.forEach((obs) => drawCar(obs, false));
      drawCar(player, true);
      drawScoreHUD();

      animId = requestAnimationFrame(gameLoop);
    }

    function startRace() {
      resetGame();
      isRunning = true;
      isGameOver = false;
      animId = requestAnimationFrame(gameLoop);
    }

    // Public API
    window.openCarRace = function () {
      if (!modal) return;
      modal.style.display = "flex";
      startRace();
    };

    window.closeCarRace = function () {
      if (!modal) return;
      isRunning = false;
      isGameOver = false;
      cancelAnimationFrame(animId);
      modal.style.display = "none";
    };

    if (closeBtn) closeBtn.addEventListener("click", window.closeCarRace);
    if (restartBtn) restartBtn.addEventListener("click", startRace);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initRaceArcade);
  } else {
    initRaceArcade();
  }
})();
