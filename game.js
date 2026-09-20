/**
 * Mushak's Modak Dash - Main Game Engine
 * Ganesh Chaturthi Game Design Contest
 * High-performance, zero-asset-dependency HTML5 Canvas arcade game
 */

(function () {
  'use strict';

  // --- Constants & Config ---
  const LOGICAL_WIDTH = 540;
  const LOGICAL_HEIGHT = 960;
  const GROUND_Y = 860;
  const HIGH_SCORE_KEY = 'mushak_modak_dash_highscore_v1';

  // State Machine
  const STATE = {
    START: 'START',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAMEOVER: 'GAMEOVER'
  };

  // Ganesh Chaturthi Blessings Quotes for Game Over
  const FESTIVE_QUOTES = [
    "\"Vakratunda Mahakaya, Suryakoti Samaprabha! May Bappa bless your journey!\"",
    "\"Ganpati Bappa Morya! Mushak enjoyed every sweet modak!\"",
    "\"Sukhkarta Dukhharta! May happiness and wisdom fill your life!\"",
    "\"A magnificent offering! Lord Ganesha smiles upon your devotion!\"",
    "\"Modak-priya Ganesha rejoices in your heroic feast!\""
  ];

  // --- Particle Systems ---
  class Particle {
    constructor(x, y, vx, vy, color, size, life, shape = 'circle') {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.color = color;
      this.size = size;
      this.maxLife = life;
      this.life = life;
      this.shape = shape;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.15;
    }

    update(dt) {
      this.x += this.vx * dt * 60;
      this.y += this.vy * dt * 60;
      this.rotation += this.rotSpeed * dt * 60;
      this.life -= dt;
      return this.life > 0;
    }

    draw(ctx) {
      const alpha = Math.max(0, this.life / this.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);

      if (this.shape === 'star') {
        ctx.fillStyle = this.color;
        this.drawStar(ctx, 0, 0, 4, this.size, this.size * 0.4);
      } else if (this.shape === 'petal') {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size * 1.6, this.size * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
      let rot = Math.PI / 2 * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      ctx.beginPath();
      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Floating Text Popups (+10, COMBO x3!, etc.)
  class FloatingText {
    constructor(text, x, y, color = '#ffd700', size = 20) {
      this.text = text;
      this.x = x;
      this.y = y;
      this.vy = -1.8;
      this.color = color;
      this.size = size;
      this.life = 0.9;
      this.maxLife = 0.9;
    }

    update(dt) {
      this.y += this.vy * dt * 60;
      this.life -= dt;
      return this.life > 0;
    }

    draw(ctx) {
      const alpha = Math.max(0, this.life / this.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `900 ${this.size}px 'Outfit', sans-serif`;
      ctx.fillStyle = this.color;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;
      ctx.fillText(this.text, this.x, this.y);
      ctx.restore();
    }
  }

  // --- Falling Entities (Modaks & Obstacles) ---
  class FallingItem {
    constructor(type, x, speed) {
      this.type = type; // 'steamed', 'fried', 'maha', 'coconut', 'crow'
      this.x = x;
      this.y = -50;
      this.vy = speed;
      this.vx = 0;
      this.radius = 28;
      this.rotation = 0;
      this.rotSpeed = 0;
      this.isObstacle = (type === 'coconut' || type === 'crow');
      this.isCollected = false;
      this.animTimer = Math.random() * 10;

      if (type === 'coconut') {
        this.radius = 28;
        this.rotSpeed = (Math.random() - 0.5) * 0.12;
      } else if (type === 'crow') {
        this.radius = 32;
        this.vx = (Math.random() - 0.5) * 1.8;
        this.vy = speed * 1.15;
      } else if (type === 'maha') {
        this.radius = 34;
      }
    }

    update(dt, player, magnetActive) {
      this.animTimer += dt;

      // Magnet pull toward Mushak if active and this is a modak
      if (magnetActive && !this.isObstacle && this.y > 100) {
        const dx = player.x - this.x;
        const dy = (player.y - 30) - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 320) {
          this.vx += (dx / dist) * 14 * dt * 60;
          this.vy += (dy / dist) * 6 * dt * 60;
        }
      }

      this.x += this.vx * dt * 60;
      this.y += this.vy * dt * 60;
      this.rotation += this.rotSpeed * dt * 60;

      // Crow subtle wing bobbing and boundary bounce
      if (this.type === 'crow') {
        if (this.x < 40) { this.x = 40; this.vx *= -1; }
        if (this.x > LOGICAL_WIDTH - 40) { this.x = LOGICAL_WIDTH - 40; this.vx *= -1; }
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);

      if (this.type === 'steamed') {
        this.drawSteamedModak(ctx);
      } else if (this.type === 'fried') {
        this.drawFriedModak(ctx);
      } else if (this.type === 'maha') {
        this.drawMahaModak(ctx);
      } else if (this.type === 'coconut') {
        this.drawCoconut(ctx);
      } else if (this.type === 'crow') {
        this.drawCrow(ctx);
      }

      ctx.restore();
    }

    // Traditional Steamed Modak (Ukadiche Modak)
    drawSteamedModak(ctx) {
      // Soft divine glow behind modak
      const glow = ctx.createRadialGradient(0, 0, 5, 0, 0, 32);
      glow.addColorStop(0, 'rgba(255, 235, 180, 0.4)');
      glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 32, 0, Math.PI * 2);
      ctx.fill();

      // Fluted bulbous body
      ctx.save();
      ctx.fillStyle = '#fffdf7';
      ctx.strokeStyle = '#e6dbc5';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(0, -26); // Pointed top tip
      ctx.bezierCurveTo(16, -10, 24, 10, 20, 20); // Right fluted curve
      ctx.bezierCurveTo(14, 28, -14, 28, -20, 20); // Bottom base
      ctx.bezierCurveTo(-24, 10, -16, -10, 0, -26); // Left curve
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Pleat creases (folds)
      ctx.strokeStyle = '#dfd1b8';
      ctx.lineWidth = 1.2;
      [-12, -6, 0, 6, 12].forEach(px => {
        ctx.beginPath();
        ctx.moveTo(0, -24);
        ctx.quadraticCurveTo(px * 1.3, 5, px, 22);
        ctx.stroke();
      });

      // Saffron (kesar) strand & fragrant yellow dot on the peak
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(0, -24, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#c2410c';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -24);
      ctx.lineTo(2, -28);
      ctx.stroke();

      ctx.restore();
    }

    // Golden Fried Modak (Talniche Modak)
    drawFriedModak(ctx) {
      // Golden shimmering aura
      const aura = ctx.createRadialGradient(0, 0, 6, 0, 0, 36);
      aura.addColorStop(0, 'rgba(255, 215, 0, 0.6)');
      aura.addColorStop(1, 'rgba(217, 119, 6, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, Math.PI * 2);
      ctx.fill();

      // Rich crisp golden-fried body gradient
      const grad = ctx.createLinearGradient(-15, -20, 15, 20);
      grad.addColorStop(0, '#fef08a');
      grad.addColorStop(0.35, '#f59e0b');
      grad.addColorStop(0.85, '#d97706');
      grad.addColorStop(1, '#92400e');

      ctx.fillStyle = grad;
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(0, -26);
      ctx.bezierCurveTo(18, -10, 25, 10, 20, 20);
      ctx.bezierCurveTo(14, 28, -14, 28, -20, 20);
      ctx.bezierCurveTo(-25, 10, -18, -10, 0, -26);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Deep golden pleats
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 1.3;
      [-12, -6, 0, 6, 12].forEach(px => {
        ctx.beginPath();
        ctx.moveTo(0, -24);
        ctx.quadraticCurveTo(px * 1.3, 5, px, 22);
        ctx.stroke();
      });

      // Shimmer sparkles
      ctx.fillStyle = '#ffffff';
      const sparkX = Math.sin(this.animTimer * 6) * 12;
      const sparkY = Math.cos(this.animTimer * 6) * 12;
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Divine Maha Modak (Grand Offering)
    drawMahaModak(ctx) {
      // Celestial rotating rays
      ctx.save();
      ctx.rotate(this.animTimer * 1.5);
      for (let i = 0; i < 8; i++) {
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = 'rgba(255, 215, 0, 0.25)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-6, 42);
        ctx.lineTo(6, 42);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Pulsing rainbow-gold aura
      const pulse = 1 + Math.sin(this.animTimer * 5) * 0.08;
      ctx.scale(pulse, pulse);

      const grad = ctx.createRadialGradient(0, -5, 4, 0, 5, 34);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#fde047');
      grad.addColorStop(0.65, '#f59e0b');
      grad.addColorStop(1, '#b91c1c');

      ctx.fillStyle = grad;
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(0, -32);
      ctx.bezierCurveTo(22, -12, 30, 12, 24, 25);
      ctx.bezierCurveTo(16, 34, -16, 34, -24, 25);
      ctx.bezierCurveTo(-30, 12, -22, -12, 0, -32);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Ornate Sacred Tilak on the Maha Modak
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.ellipse(0, -2, 3.5, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(0, -2, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Tumbling Coconut (Nariyal)
    drawCoconut(ctx) {
      // Coir fiber husk base
      ctx.fillStyle = '#5c3317';
      ctx.strokeStyle = '#381e0b';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Texture streaks (husk coir)
      ctx.strokeStyle = '#78431e';
      ctx.lineWidth = 1.2;
      for (let i = -14; i <= 14; i += 6) {
        ctx.beginPath();
        ctx.moveTo(i, -20);
        ctx.quadraticCurveTo(i * 1.4, 0, i, 20);
        ctx.stroke();
      }

      // Three sacred eyes of the coconut (Trinetra)
      ctx.fillStyle = '#221105';
      ctx.beginPath();
      ctx.arc(-6, -8, 2.5, 0, Math.PI * 2);
      ctx.arc(6, -8, 2.5, 0, Math.PI * 2);
      ctx.arc(0, -14, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Little tuft of fibers on the top
      ctx.strokeStyle = '#a25925';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, -26);
      ctx.lineTo(-4, -33);
      ctx.moveTo(0, -26);
      ctx.lineTo(3, -34);
      ctx.stroke();
    }

    // Mischievous Crow (Kaka)
    drawCrow(ctx) {
      const wingFlap = Math.sin(this.animTimer * 14) * 0.7;

      // Facing flight direction
      const dir = this.vx >= 0 ? 1 : -1;
      ctx.scale(dir, 1);

      // Crow Body
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 12, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Flapping Wings
      ctx.save();
      ctx.translate(-2, -4);
      ctx.rotate(wingFlap);
      ctx.fillStyle = '#27272a';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-14, -22);
      ctx.lineTo(8, -12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Crow Head
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(14, -5, 9, 0, Math.PI * 2);
      ctx.fill();

      // Beak
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.moveTo(21, -8);
      ctx.lineTo(32, -4);
      ctx.lineTo(21, -2);
      ctx.closePath();
      ctx.fill();

      // Crow Eye
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(17, -7, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(18, -7, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Tail Feathers
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(-28, 5);
      ctx.lineTo(-26, -3);
      ctx.closePath();
      ctx.fill();
    }
  }

  // --- Main Character: Mushak (Ganesha's Mouse) ---
  class Mushak {
    constructor() {
      this.x = LOGICAL_WIDTH / 2;
      this.y = GROUND_Y;
      this.width = 76;
      this.height = 70;
      this.targetX = LOGICAL_WIDTH / 2;
      this.vx = 0;
      this.speed = 460; // Pixels per second
      this.facing = 1; // 1 = right, -1 = left
      this.isEating = 0; // Timer for happy eating face
      this.isInvulnerable = 0;
      this.animTime = 0;
      this.tailPhase = 0;
      this.blinkTimer = 2.5;
      this.isBlinking = false;
    }

    update(dt, inputDir, mouseTargetX) {
      this.animTime += dt;
      this.tailPhase += dt * 8;

      if (this.isEating > 0) this.isEating -= dt;
      if (this.isInvulnerable > 0) this.isInvulnerable -= dt;

      // Handle natural eye blinking
      this.blinkTimer -= dt;
      if (this.blinkTimer <= 0) {
        this.isBlinking = true;
        if (this.blinkTimer <= -0.15) {
          this.isBlinking = false;
          this.blinkTimer = 2 + Math.random() * 3;
        }
      }

      // Movement logic
      let moving = false;
      if (inputDir !== 0) {
        this.vx = inputDir * this.speed;
        this.facing = inputDir > 0 ? 1 : -1;
        moving = true;
      } else if (mouseTargetX !== null) {
        // Smooth mouse / touch tracking
        const diff = mouseTargetX - this.x;
        if (Math.abs(diff) > 4) {
          this.vx = Math.sign(diff) * Math.min(Math.abs(diff) * 12, this.speed);
          this.facing = diff > 0 ? 1 : -1;
          moving = true;
        } else {
          this.vx = 0;
        }
      } else {
        this.vx *= 0.82; // Smooth friction stop
      }

      this.x += this.vx * dt;

      // Screen boundaries
      const minX = 46;
      const maxX = LOGICAL_WIDTH - 46;
      if (this.x < minX) this.x = minX;
      if (this.x > maxX) this.x = maxX;
    }

    // Procedural Vector Rendering of Mushak
    draw(ctx, isPreview = false) {
      ctx.save();

      // Invulnerability flicker
      if (this.isInvulnerable > 0 && Math.floor(this.animTime * 20) % 2 === 0) {
        ctx.globalAlpha = 0.45;
      }

      ctx.translate(this.x, this.y);

      // Running bob & squash/stretch
      const runBob = isPreview ? Math.sin(this.animTime * 3) * 3 : Math.sin(this.animTime * 14) * (Math.abs(this.vx) > 30 ? 4 : 1.5);
      ctx.translate(0, -runBob);

      // Facing orientation
      ctx.scale(this.facing, 1);

      // 1. Soft Shadow on temple floor
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 18 + runBob, 36, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Mushak's Wavy Flexible Tail (drawn behind body)
      ctx.strokeStyle = '#e2b39f';
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const tailWiggle = Math.sin(this.tailPhase) * 14;
      ctx.moveTo(-18, 6);
      ctx.bezierCurveTo(-34, 10 + tailWiggle * 0.5, -44, -6 + tailWiggle, -56, -14 + tailWiggle * 1.2);
      ctx.stroke();

      // 3. Mushak's Feet / Paws
      ctx.fillStyle = '#e2b39f';
      ctx.beginPath();
      ctx.ellipse(-14, 14, 9, 5.5, 0, 0, Math.PI * 2);
      ctx.ellipse(14, 14, 9, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 4. Mushak's Plump Body (warm shaded fur)
      const bodyGrad = ctx.createRadialGradient(2, -4, 6, 0, 2, 28);
      bodyGrad.addColorStop(0, '#c7b39b');
      bodyGrad.addColorStop(0.7, '#8e7960');
      bodyGrad.addColorStop(1, '#65533e');

      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.ellipse(0, 2, 26, 20, 0, 0, Math.PI * 2);
      ctx.fill();

      // Festive Little Dhoti on Mushak
      ctx.fillStyle = '#d9480f';
      ctx.beginPath();
      ctx.ellipse(0, 8, 22, 8, 0, 0, Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.stroke();

      // ====================================================================
      // ROYAL SADDLE (ASANA) ON MUSHAK'S BACK FOR LORD GANESHA
      // ====================================================================
      ctx.save();
      // Royal crimson velvet saddle pad (expanded for grander Ganesha)
      const saddleGrad = ctx.createLinearGradient(-30, -13, 20, -13);
      saddleGrad.addColorStop(0, '#991b1b');
      saddleGrad.addColorStop(0.5, '#dc2626');
      saddleGrad.addColorStop(1, '#991b1b');
      ctx.fillStyle = saddleGrad;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(-28, -17, 44, 11, 6) : ctx.rect(-28, -17, 44, 11);
      ctx.fill();

      // Gold embroidery & fringe
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2.4;
      ctx.stroke();

      // Hanging golden tassels
      ctx.fillStyle = '#fbbf24';
      [-24, -17, -10, -3, 4, 11].forEach(tx => {
        ctx.beginPath();
        ctx.arc(tx, -5, 2.4, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      // ====================================================================
      // LORD BAL GANESHA SEATED MAJESTICALLY ON TOP OF MUSHAK (GRANDER SCALE)
      // ====================================================================
      ctx.save();
      // Position Ganesha comfortably and scale even bigger (1.70x)
      const gBaseX = -4;
      const gBaseY = -14;
      ctx.translate(gBaseX, gBaseY);
      ctx.scale(1.70, 1.70);

      const gx = 0;
      const gy = 0;

      // Divine Golden Prabhavali (Halo) behind Ganesha's head
      const haloPulse = 1 + (this.isEating > 0 ? 0.25 : Math.sin(this.animTime * 3) * 0.06);
      const haloRadius = 26 * haloPulse;
      const haloGrad = ctx.createRadialGradient(gx, gy - 26, 6, gx, gy - 26, haloRadius);
      haloGrad.addColorStop(0, 'rgba(255, 245, 200, 0.7)');
      haloGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.45)');
      haloGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(gx, gy - 26, haloRadius, 0, Math.PI * 2);
      ctx.fill();

      // Divine rays when modak is eaten
      if (this.isEating > 0) {
        ctx.save();
        ctx.translate(gx, gy - 26);
        ctx.rotate(this.animTime * 6);
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
        ctx.lineWidth = 1.5;
        for (let r = 0; r < 8; r++) {
          ctx.rotate(Math.PI / 4);
          ctx.beginPath();
          ctx.moveTo(0, 10);
          ctx.lineTo(0, haloRadius + 4);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 1. Ganesha's Seated Legs & Yellow Silk Dhoti (Pitambara)
      ctx.fillStyle = '#f59e0b'; // Radiant saffron-yellow silk
      ctx.beginPath();
      ctx.ellipse(gx - 8, gy + 3, 10, 6, -0.2, 0, Math.PI * 2); // Folded left leg
      ctx.ellipse(gx + 6, gy + 4, 10, 6, 0.2, 0, Math.PI * 2);  // Folded right leg
      ctx.fill();

      // Red & gold zardozi border on dhoti
      ctx.strokeStyle = '#b91c1c';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Little divine golden anklet (payal) on baby foot
      ctx.fillStyle = '#fde68a'; // Soft lotus baby foot
      ctx.beginPath();
      ctx.arc(gx + 12, gy + 6, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(gx + 10, gy + 5, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // 2. Ganesha's Chubby Baby Pot-Belly (Lambodara)
      const bellyGrad = ctx.createRadialGradient(gx + 1, gy - 8, 3, gx, gy - 7, 16);
      bellyGrad.addColorStop(0, '#fed7aa');
      bellyGrad.addColorStop(0.7, '#fba779');
      bellyGrad.addColorStop(1, '#e07a48');

      ctx.fillStyle = bellyGrad;
      ctx.beginPath();
      ctx.ellipse(gx, gy - 7, 14, 13, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sacred Thread (Yajnopavita) diagonally across Ganesha's chest
      ctx.strokeStyle = '#15803d'; // Sacred green/gold thread
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(gx - 7, gy - 16);
      ctx.quadraticCurveTo(gx, gy - 6, gx + 9, gy + 2);
      ctx.stroke();

      // Sacred Golden Necklace (Kanthi Haar)
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(gx, gy - 14, 7, 0.2, Math.PI - 0.2);
      ctx.stroke();

      // Ruby gemstone pendant
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(gx, gy - 8, 2, 0, Math.PI * 2);
      ctx.fill();

      // 3. Divine Four Arms
      // Back Upper Left Hand holding sacred pink Lotus flower (Padma)
      ctx.fillStyle = '#fba779';
      ctx.beginPath();
      ctx.arc(gx - 14, gy - 15, 3.5, 0, Math.PI * 2);
      ctx.fill();
      // Lotus
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.ellipse(gx - 17, gy - 19, 4, 6, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.ellipse(gx - 17, gy - 19, 2.5, 4, -0.3, 0, Math.PI * 2);
      ctx.fill();

      // Back Upper Right Hand holding Golden Ankusha (Sacred Goad)
      ctx.fillStyle = '#fba779';
      ctx.beginPath();
      ctx.arc(gx + 13, gy - 16, 3.5, 0, Math.PI * 2);
      ctx.fill();
      // Ankusha
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(gx + 13, gy - 12);
      ctx.lineTo(gx + 16, gy - 25);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(gx + 18, gy - 22, 3, 0.5, 3.5);
      ctx.stroke();

      // Front Lower Left Hand holding Golden Bowl with sweet Modak!
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.ellipse(gx - 9, gy - 4, 5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Modak in Ganesha's bowl
      ctx.fillStyle = '#fffdfa';
      ctx.beginPath();
      ctx.moveTo(gx - 9, gy - 9);
      ctx.lineTo(gx - 6, gy - 5);
      ctx.lineTo(gx - 12, gy - 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ea580c'; // Saffron dot
      ctx.fillRect(gx - 10, gy - 9, 2, 2);

      // Front Lower Right Hand: ABHAYA MUDRA (Blessing Palm)
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.ellipse(gx + 11, gy - 6, 4.5, 6, 0.25, 0, Math.PI * 2);
      ctx.fill();

      // Sacred red lotus mark on palm
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(gx + 11, gy - 6, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Golden blessing spark burst from palm when modak caught!
      if (this.isEating > 0) {
        ctx.fillStyle = '#ffd700';
        for (let b = 0; b < 4; b++) {
          const bAngle = (this.animTime * 10) + (b * Math.PI / 2);
          const bx = gx + 11 + Math.cos(bAngle) * 7;
          const by = gy - 6 + Math.sin(bAngle) * 7;
          ctx.beginPath();
          ctx.arc(bx, by, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 4. Large Divine Fan-Shaped Ears (Supakarna)
      const earSway = Math.sin(this.animTime * 4) * 0.12;

      // Back Ear
      ctx.save();
      ctx.translate(gx - 10, gy - 23);
      ctx.rotate(-earSway);
      ctx.fillStyle = '#fba779';
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 12, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 8, -0.2, 0, Math.PI * 2);
      ctx.fill();
      // Golden Earring (Kundala)
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(2, 10, 2.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Front Ear
      ctx.save();
      ctx.translate(gx + 10, gy - 23);
      ctx.rotate(earSway);
      ctx.fillStyle = '#fba779';
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 12, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 8, 0.2, 0, Math.PI * 2);
      ctx.fill();
      // Golden Earring (Kundala)
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(-2, 10, 2.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 5. Ganesha's Head
      const gHeadGrad = ctx.createRadialGradient(gx + 1, gy - 26, 4, gx, gy - 24, 15);
      gHeadGrad.addColorStop(0, '#fed7aa');
      gHeadGrad.addColorStop(0.75, '#fba779');
      gHeadGrad.addColorStop(1, '#e07a48');

      ctx.fillStyle = gHeadGrad;
      ctx.beginPath();
      ctx.ellipse(gx, gy - 24, 12.5, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // 6. Curved Trunk (Vakratunda) curling sweetly toward the modak
      const trunkWiggle = Math.sin(this.animTime * 6) * 1.5;
      ctx.strokeStyle = '#fba779';
      ctx.lineWidth = 5.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(gx, gy - 21);
      ctx.quadraticCurveTo(gx - 4, gy - 12, gx - 1 + trunkWiggle, gy - 8);
      ctx.quadraticCurveTo(gx + 4 + trunkWiggle, gy - 5, gx + 6, gy - 8); // Tip curling up
      ctx.stroke();

      // Tiny modak at trunk tip when eating
      if (this.isEating > 0) {
        ctx.fillStyle = '#fffdfa';
        ctx.beginPath();
        ctx.arc(gx + 7, gy - 9, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Sacred White Tusks (Ekadanta)
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#f3f4f6';
      ctx.lineWidth = 1;
      // Right full tusk
      ctx.beginPath();
      ctx.moveTo(gx + 4, gy - 16);
      ctx.lineTo(gx + 8, gy - 13);
      ctx.lineTo(gx + 4, gy - 14);
      ctx.fill();
      ctx.stroke();
      // Left broken tusk (Ekadanta)
      ctx.beginPath();
      ctx.moveTo(gx - 4, gy - 16);
      ctx.lineTo(gx - 6, gy - 14);
      ctx.lineTo(gx - 3, gy - 14);
      ctx.fill();
      ctx.stroke();

      // 7. Ganesha's Gentle, Loving Eyes
      // Left Eye
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.arc(gx - 4.5, gy - 25, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(gx - 4, gy - 25.8, 0.9, 0, Math.PI * 2);
      ctx.fill();

      // Right Eye
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.arc(gx + 4.5, gy - 25, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(gx + 5, gy - 25.8, 0.9, 0, Math.PI * 2);
      ctx.fill();

      // 8. Sacred Tripundra & Sindoor Tilak on Forehead
      // Chandan Sandalwood crescent
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(gx, gy - 29, 3.5, 0.2, Math.PI - 0.2);
      ctx.stroke();

      // Red Vermilion Tilak
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.ellipse(gx, gy - 29, 1.4, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Golden Center Bindu
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(gx, gy - 29, 1, 0, Math.PI * 2);
      ctx.fill();

      // 9. Royal Golden Mukuta (Crown)
      const crownGrad = ctx.createLinearGradient(gx - 10, gy - 33, gx + 10, gy - 49);
      crownGrad.addColorStop(0, '#fef08a');
      crownGrad.addColorStop(0.5, '#f59e0b');
      crownGrad.addColorStop(1, '#b45309');

      ctx.fillStyle = crownGrad;
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.5;

      // Tiered Crown Base
      ctx.beginPath();
      ctx.moveTo(gx - 9, gy - 32);
      ctx.lineTo(gx - 7, gy - 42);
      ctx.lineTo(gx - 3, gy - 45);
      ctx.lineTo(gx, gy - 51); // Spire apex
      ctx.lineTo(gx + 3, gy - 45);
      ctx.lineTo(gx + 7, gy - 42);
      ctx.lineTo(gx + 9, gy - 32);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Gemstone Insets on Crown
      ctx.fillStyle = '#dc2626'; // Ruby
      ctx.beginPath();
      ctx.arc(gx, gy - 37, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#10b981'; // Emerald
      ctx.beginPath();
      ctx.arc(gx - 4, gy - 36, 1.4, 0, Math.PI * 2);
      ctx.arc(gx + 4, gy - 36, 1.4, 0, Math.PI * 2);
      ctx.fill();

      // Golden Spire Jewel on Top of Crown
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(gx, gy - 51, 1.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // ====================================================================
      // MUSHAK'S HEAD, PAGDI, PAWS & OFFERING THALI (FRONT)
      // ====================================================================

      // 5. Mushak's Chubby Cheeks / Head
      const headGrad = ctx.createRadialGradient(10, -14, 4, 8, -12, 20);
      headGrad.addColorStop(0, '#d8c5af');
      headGrad.addColorStop(0.75, '#998369');
      headGrad.addColorStop(1, '#6d5a44');

      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.ellipse(8, -12, 18, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      // 6. Cute Ears with Soft Pink Inner Cartilage
      // Back Ear
      ctx.fillStyle = '#8e7960';
      ctx.beginPath();
      ctx.arc(-2, -26, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f4a5ae';
      ctx.beginPath();
      ctx.arc(-2, -26, 6, 0, Math.PI * 2);
      ctx.fill();

      // Front Ear
      ctx.fillStyle = '#998369';
      ctx.beginPath();
      ctx.arc(14, -28, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      ctx.arc(14, -28, 7, 0, Math.PI * 2);
      ctx.fill();

      // 7. Festive Royal Pagdi (Turban) on Mushak's Head
      ctx.fillStyle = '#dc2626'; // Auspicious vermilion red
      ctx.beginPath();
      ctx.ellipse(8, -25, 13, 7.5, -0.1, 0, Math.PI * 2);
      ctx.fill();

      // Gold turban wrap border
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(8, -25, 12, 0.4, 2.8);
      ctx.stroke();

      // Tiny Royal Brooch (Kalgi) & Peacock Feather Accent
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.ellipse(4, -33, 2.8, 6, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(5, -30, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // 8. Sacred Red Tilak on Mushak's Forehead
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.ellipse(14, -20, 2, 4.5, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(14, -20, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // 9. Cute Eyes (Sparkling or Happy Chomping)
      if (this.isEating > 0) {
        ctx.strokeStyle = '#1e1b18';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(16, -14, 4, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      } else if (this.isBlinking) {
        ctx.strokeStyle = '#1e1b18';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(12, -14);
        ctx.lineTo(19, -14);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.arc(16, -14, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(17.5, -15.5, 1.8, 0, Math.PI * 2);
        ctx.arc(14.5, -12.5, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // 10. Cute Snout, Pink Nose & Whiskers
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.ellipse(26, -12, 3, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#443322';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (this.isEating > 0) {
        ctx.fillStyle = '#e11d48';
        ctx.arc(22, -9, 4, 0, Math.PI);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.arc(22, -9, 3, 0.1, Math.PI * 0.9);
        ctx.stroke();
      }

      // Twitching Whiskers
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1.2;
      const whiskerTwitch = Math.sin(this.animTime * 12) * 1.2;
      ctx.beginPath();
      ctx.moveTo(23, -11);
      ctx.lineTo(36, -13 + whiskerTwitch);
      ctx.moveTo(23, -9);
      ctx.lineTo(35, -6 - whiskerTwitch);
      ctx.stroke();

      // 11. Golden Offering Plate (Thali) Held by Paws to Catch Modaks!
      const thaliGrad = ctx.createLinearGradient(12, -7, 38, -7);
      thaliGrad.addColorStop(0, '#fef08a');
      thaliGrad.addColorStop(0.5, '#f59e0b');
      thaliGrad.addColorStop(1, '#b45309');

      ctx.fillStyle = thaliGrad;
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.8;

      ctx.beginPath();
      ctx.ellipse(26, -5, 19, 5.5, 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(26, -5, 15, 3.2, 0.05, 0, Math.PI * 2);
      ctx.stroke();

      // Mushak's cute paws holding the thali
      ctx.fillStyle = '#e2b39f';
      ctx.beginPath();
      ctx.arc(14, -4, 3.5, 0, Math.PI * 2);
      ctx.arc(24, -2, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // --- Main Game Controller ---
  class GameEngine {
    constructor() {
      this.canvas = document.getElementById('gameCanvas');
      this.ctx = this.canvas.getContext('2d');
      this.state = STATE.START;

      this.player = new Mushak();
      this.items = [];
      this.particles = [];
      this.floatingTexts = [];
      this.ambientPetals = [];

      // Metrics
      this.score = 0;
      this.combo = 1;
      this.maxCombo = 1;
      this.lives = 3;
      this.misses = 0; // 3 misses = 1 life lost
      this.highScore = parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10);

      // Timers & Spawning
      this.spawnTimer = 0;
      this.spawnInterval = 1.3;
      this.baseFallSpeed = 3.5;
      this.gameTime = 0;
      this.magnetTimer = 0; // Maha modak power-up
      this.screenShake = 0;

      // Input States
      this.inputDir = 0;
      this.mouseTargetX = null;
      this.keys = { left: false, right: false };

      // DOM Elements Cache
      this.dom = {
        score: document.getElementById('score-display'),
        combo: document.getElementById('combo-display'),
        comboContainer: document.getElementById('combo-container'),
        missMeter: document.getElementById('miss-meter'),
        missDots: [
          document.getElementById('miss-1'),
          document.getElementById('miss-2'),
          document.getElementById('miss-3')
        ],
        lifeDiyas: [
          document.getElementById('life-1'),
          document.getElementById('life-2'),
          document.getElementById('life-3')
        ],
        powerupToast: document.getElementById('powerup-toast'),
        powerupText: document.getElementById('powerup-text'),
        startScreen: document.getElementById('start-screen'),
        pauseScreen: document.getElementById('pause-screen'),
        gameoverScreen: document.getElementById('gameover-screen'),
        startHighScore: document.getElementById('start-high-score'),
        finalScore: document.getElementById('final-score'),
        finalCombo: document.getElementById('final-combo'),
        finalHighScore: document.getElementById('final-high-score'),
        newHighBadge: document.getElementById('new-high-score-badge'),
        gameoverQuote: document.getElementById('gameover-quote'),
        btnStart: document.getElementById('btn-start'),
        btnPause: document.getElementById('btn-pause'),
        btnResume: document.getElementById('btn-resume'),
        btnRestart: document.getElementById('btn-restart'),
        btnRestartPause: document.getElementById('btn-restart-pause'),
        btnHome: document.getElementById('btn-home'),
        btnHomePause: document.getElementById('btn-home-pause'),
        btnSound: document.getElementById('btn-sound'),
        soundIconOn: document.getElementById('sound-icon-on'),
        soundIconOff: document.getElementById('sound-icon-off'),
        heroPreviewCanvas: document.getElementById('heroPreviewCanvas'),

        // Registration & Leaderboard DOM
        registrationModal: document.getElementById('registration-modal'),
        formRegistration: document.getElementById('form-registration'),
        regName: document.getElementById('reg-name'),
        regUni: document.getElementById('reg-uni'),
        regError: document.getElementById('reg-error'),
        btnRegSubmit: document.getElementById('btn-reg-submit'),
        devoteeProfileBanner: document.getElementById('devotee-profile-banner'),
        devoteeDisplayName: document.getElementById('devotee-display-name'),
        devoteeDisplayUni: document.getElementById('devotee-display-uni'),
        btnEditProfile: document.getElementById('btn-edit-profile'),

        leaderboardModal: document.getElementById('leaderboard-modal'),
        btnLeaderboardHud: document.getElementById('btn-leaderboard-hud'),
        btnLeaderboardStart: document.getElementById('btn-leaderboard-start'),
        btnLeaderboardGameover: document.getElementById('btn-leaderboard-gameover'),
        btnLbClose: document.getElementById('btn-lb-close'),
        btnLbPlay: document.getElementById('btn-lb-play'),
        btnLbRefresh: document.getElementById('btn-lb-refresh'),
        lbTotalCount: document.getElementById('lb-total-count'),
        lbLoading: document.getElementById('lb-loading'),
        lbEmpty: document.getElementById('lb-empty'),
        lbList: document.getElementById('lb-list'),
        lbPlayerPinned: document.getElementById('lb-player-pinned'),
        lbPlayerPinnedContent: document.getElementById('lb-player-pinned-content')
      };

      this.previewAnimId = null;
      this.initHeroPreview();
      this.initAmbientPetals();
      this.setupEventListeners();
      this.updateHud();
      this.checkRegistrationOnLoad();

      // Start RAF Loop
      this.lastTime = performance.now();
      requestAnimationFrame(this.gameLoop.bind(this));
    }

    // Hero Preview in Start Screen Modal
    initHeroPreview() {
      if (this.previewAnimId) {
        cancelAnimationFrame(this.previewAnimId);
        this.previewAnimId = null;
      }
      const heroCtx = this.dom.heroPreviewCanvas.getContext('2d');
      const previewMushak = new Mushak();
      previewMushak.x = 102;
      previewMushak.y = 152;

      const animatePreview = () => {
        heroCtx.clearRect(0, 0, 220, 205);
        previewMushak.update(0.016, 0, null);
        previewMushak.draw(heroCtx, true);

        // Draw a floating mini modak being admired by Bappa and Mushak
        const floatY = 48 + Math.sin(performance.now() * 0.003) * 6;
        heroCtx.save();
        heroCtx.translate(164, floatY);
        heroCtx.scale(0.95, 0.95);
        const dummyModak = new FallingItem('fried', 0, 0);
        dummyModak.draw(heroCtx);
        heroCtx.restore();

        if (this.state === STATE.START) {
          this.previewAnimId = requestAnimationFrame(animatePreview);
        } else {
          this.previewAnimId = null;
        }
      };
      this.previewAnimId = requestAnimationFrame(animatePreview);
    }

    // Prepopulate peaceful falling marigold and lotus petals
    initAmbientPetals() {
      for (let i = 0; i < 20; i++) {
        this.ambientPetals.push({
          x: Math.random() * LOGICAL_WIDTH,
          y: Math.random() * LOGICAL_HEIGHT,
          speed: 0.6 + Math.random() * 1.2,
          swaySpeed: 1 + Math.random() * 2,
          swayAmp: 1 + Math.random() * 2,
          size: 4 + Math.random() * 4,
          color: Math.random() > 0.4 ? '#f59e0b' : '#f43f5e', // Marigold gold or Lotus pink
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    // Input & Interaction Listeners
    setupEventListeners() {
      // Keyboard Controls
      window.addEventListener('keydown', (e) => {
        if (e.repeat) return;
        window.soundEngine.ensureRunning();

        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          this.keys.left = true;
          this.mouseTargetX = null;
          this.updateInputDir();
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          this.keys.right = true;
          this.mouseTargetX = null;
          this.updateInputDir();
        } else if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
          if (this.state === STATE.PLAYING) this.pauseGame();
          else if (this.state === STATE.PAUSED) this.resumeGame();
        }
      });

      window.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          this.keys.left = false;
          this.updateInputDir();
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          this.keys.right = false;
          this.updateInputDir();
        }
      });

      // Mouse & Touch Movement on Canvas
      const handlePointer = (clientX) => {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = LOGICAL_WIDTH / rect.width;
        this.mouseTargetX = (clientX - rect.left) * scaleX;
      };

      this.canvas.addEventListener('mousemove', (e) => {
        if (this.state === STATE.PLAYING) {
          handlePointer(e.clientX);
        }
      });

      this.canvas.addEventListener('touchstart', (e) => {
        window.soundEngine.ensureRunning();
        if (this.state === STATE.PLAYING && e.touches.length > 0) {
          handlePointer(e.touches[0].clientX);
        }
      }, { passive: true });

      this.canvas.addEventListener('touchmove', (e) => {
        if (this.state === STATE.PLAYING && e.touches.length > 0) {
          handlePointer(e.touches[0].clientX);
        }
      }, { passive: true });

      // Buttons
      this.dom.btnStart.addEventListener('click', () => {
        window.soundEngine.ensureRunning();
        if (!window.leaderboardService || !window.leaderboardService.hasProfile()) {
          this.dom.registrationModal.classList.remove('hidden');
          return;
        }
        window.soundEngine.playGameStart();
        this.startGame();
      });

      this.dom.btnPause.addEventListener('click', () => {
        if (this.state === STATE.PLAYING) this.pauseGame();
      });

      this.dom.btnResume.addEventListener('click', () => {
        this.resumeGame();
      });

      this.dom.btnRestart.addEventListener('click', () => {
        window.soundEngine.ensureRunning();
        window.soundEngine.playGameStart();
        this.startGame();
      });

      this.dom.btnRestartPause.addEventListener('click', () => {
        window.soundEngine.ensureRunning();
        window.soundEngine.playGameStart();
        this.startGame();
      });

      if (this.dom.btnHome) {
        this.dom.btnHome.addEventListener('click', () => {
          window.soundEngine.ensureRunning();
          this.goToHomeScreen();
        });
      }

      if (this.dom.btnHomePause) {
        this.dom.btnHomePause.addEventListener('click', () => {
          window.soundEngine.ensureRunning();
          this.goToHomeScreen();
        });
      }

      // Registration Form Listeners
      if (this.dom.formRegistration) {
        this.dom.formRegistration.addEventListener('submit', async (e) => {
          e.preventDefault();
          const name = (this.dom.regName.value || '').trim();
          const uni = (this.dom.regUni.value || '').trim();

          if (!name || !uni) {
            this.dom.regError.textContent = 'Please enter both your name and university!';
            this.dom.regError.classList.remove('hidden');
            return;
          }

          this.dom.regError.classList.add('hidden');
          this.dom.btnRegSubmit.disabled = true;

          try {
            await window.leaderboardService.saveProfile(name, uni);
            this.updateDevoteeBanner();
            this.dom.registrationModal.classList.add('hidden');
            window.soundEngine.ensureRunning();
            window.soundEngine.playGameStart();
            this.startGame();
          } catch (err) {
            this.dom.regError.textContent = err.message || 'Error saving profile';
            this.dom.regError.classList.remove('hidden');
          } finally {
            this.dom.btnRegSubmit.disabled = false;
          }
        });
      }

      if (this.dom.btnEditProfile) {
        this.dom.btnEditProfile.addEventListener('click', () => {
          const profile = window.leaderboardService ? window.leaderboardService.getProfile() : null;
          if (profile) {
            this.dom.regName.value = profile.playerName || '';
            this.dom.regUni.value = profile.university || '';
          }
          this.dom.regError.classList.add('hidden');
          this.dom.registrationModal.classList.remove('hidden');
        });
      }

      // Leaderboard Modal Triggers
      const openLb = () => {
        window.soundEngine.ensureRunning();
        this.showLeaderboard();
      };
      const closeLb = () => {
        this.hideLeaderboard();
      };

      if (this.dom.btnLeaderboardHud) this.dom.btnLeaderboardHud.addEventListener('click', openLb);
      if (this.dom.btnLeaderboardStart) this.dom.btnLeaderboardStart.addEventListener('click', openLb);
      if (this.dom.btnLeaderboardGameover) this.dom.btnLeaderboardGameover.addEventListener('click', openLb);
      if (this.dom.btnLbClose) this.dom.btnLbClose.addEventListener('click', closeLb);
      if (this.dom.btnLbPlay) this.dom.btnLbPlay.addEventListener('click', closeLb);
      if (this.dom.btnLbRefresh) this.dom.btnLbRefresh.addEventListener('click', () => this.loadLeaderboardData());

      // Sound Toggle
      this.dom.btnSound.addEventListener('click', () => {
        const isMuted = window.soundEngine.toggleMute();
        this.dom.soundIconOn.classList.toggle('hidden', isMuted);
        this.dom.soundIconOff.classList.toggle('hidden', !isMuted);
      });
    }

    updateInputDir() {
      if (this.keys.left && !this.keys.right) this.inputDir = -1;
      else if (this.keys.right && !this.keys.left) this.inputDir = 1;
      else this.inputDir = 0;
    }

    // --- Devotee & Leaderboard UI Helpers ---
    checkRegistrationOnLoad() {
      if (!window.leaderboardService || !window.leaderboardService.hasProfile()) {
        this.dom.registrationModal.classList.remove('hidden');
      } else {
        this.updateDevoteeBanner();
      }
    }

    updateDevoteeBanner() {
      const profile = window.leaderboardService ? window.leaderboardService.getProfile() : null;
      if (profile && this.dom.devoteeDisplayName && this.dom.devoteeDisplayUni) {
        this.dom.devoteeDisplayName.textContent = profile.playerName;
        this.dom.devoteeDisplayUni.textContent = profile.university;
      }
    }

    showLeaderboard() {
      this.dom.leaderboardModal.classList.remove('hidden');
      this.loadLeaderboardData();
    }

    hideLeaderboard() {
      this.dom.leaderboardModal.classList.add('hidden');
    }

    async loadLeaderboardData() {
      if (this.isLoadingLeaderboard) return;
      this.isLoadingLeaderboard = true;

      if (this.dom.btnLbRefresh) {
        this.dom.btnLbRefresh.disabled = true;
        this.dom.btnLbRefresh.classList.add('spinning');
      }

      if (!this.dom.lbList.hasChildNodes()) {
        this.dom.lbLoading.textContent = 'Connecting to temple records... 🪔';
        this.dom.lbLoading.classList.remove('hidden');
      }
      this.dom.lbEmpty.classList.add('hidden');

      const profile = window.leaderboardService ? window.leaderboardService.getProfile() : null;

      try {
        const [items, totalCount] = await Promise.all([
          window.leaderboardService.fetchTopOfferings(30),
          window.leaderboardService.fetchParticipantCount()
        ]);

        this.dom.lbTotalCount.textContent = totalCount || (items ? items.length : 0);
        this.dom.lbLoading.classList.add('hidden');

        if (!items || items.length === 0) {
          this.dom.lbList.replaceChildren();
          this.dom.lbEmpty.classList.remove('hidden');
          this.dom.lbPlayerPinned.classList.add('hidden');
          return;
        }

        let playerInTop = false;
        const fragment = document.createDocumentFragment();

        items.forEach((item, index) => {
          const rank = index + 1;
          const isCurrent = profile && profile.playerId === item.player_id;
          if (isCurrent) playerInTop = true;

          let rankBadge = rank.toString();
          if (rank === 1) rankBadge = '🥇';
          else if (rank === 2) rankBadge = '🥈';
          else if (rank === 3) rankBadge = '🥉';

          const row = document.createElement('div');
          row.className = `lb-row ${rank === 1 ? 'top-1' : ''} ${isCurrent ? 'is-current-player' : ''}`;
          row.innerHTML = `
            <div class="lb-rank">${rankBadge}</div>
            <div class="lb-devotee">
              <div class="lb-player-name">${this.escapeHtml(item.player_name)}${isCurrent ? ' (You)' : ''}</div>
              <div class="lb-university">${this.escapeHtml(item.university)}</div>
            </div>
            <div class="lb-score-col">
              <div class="lb-score-val">${item.high_score}</div>
              <div class="lb-score-unit">MODAKS</div>
            </div>
          `;
          fragment.appendChild(row);
        });

        this.dom.lbList.replaceChildren(fragment);

        // If registered and not in top list, show pinned standing
        if (profile && !playerInTop) {
          this.dom.lbPlayerPinned.classList.remove('hidden');
          this.dom.lbPlayerPinnedContent.innerHTML = `
            <div class="lb-row is-current-player" style="margin: 0;">
              <div class="lb-rank">🌟</div>
              <div class="lb-devotee">
                <div class="lb-player-name">${this.escapeHtml(profile.playerName)} (You)</div>
                <div class="lb-university">${this.escapeHtml(profile.university)}</div>
              </div>
              <div class="lb-score-col">
                <div class="lb-score-val">${profile.highScore || 0}</div>
                <div class="lb-score-unit">MODAKS</div>
              </div>
            </div>
          `;
        } else {
          this.dom.lbPlayerPinned.classList.add('hidden');
        }
      } catch (err) {
        console.error('Error loading leaderboard:', err);
        if (!this.dom.lbList.hasChildNodes()) {
          this.dom.lbLoading.textContent = 'Could not load leaderboard. Please check your connection.';
          this.dom.lbLoading.classList.remove('hidden');
        }
      } finally {
        this.isLoadingLeaderboard = false;
        if (this.dom.btnLbRefresh) {
          this.dom.btnLbRefresh.disabled = false;
          this.dom.btnLbRefresh.classList.remove('spinning');
        }
      }
    }

    escapeHtml(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    // --- State Transitions ---
    startGame() {
      if (this.previewAnimId) {
        cancelAnimationFrame(this.previewAnimId);
        this.previewAnimId = null;
      }
      this.score = 0;
      this.combo = 1;
      this.maxCombo = 1;
      this.lives = 3;
      this.misses = 0;
      this.items = [];
      this.particles = [];
      this.floatingTexts = [];
      this.gameTime = 0;
      this.spawnTimer = 0;
      this.magnetTimer = 0;
      this.screenShake = 0;
      this.player.x = LOGICAL_WIDTH / 2;
      this.player.isInvulnerable = 0;
      this.mouseTargetX = null;

      this.dom.startScreen.classList.add('hidden');
      if (this.dom.registrationModal) this.dom.registrationModal.classList.add('hidden');
      if (this.dom.leaderboardModal) this.dom.leaderboardModal.classList.add('hidden');
      this.dom.pauseScreen.classList.add('hidden');
      this.dom.gameoverScreen.classList.add('hidden');
      this.dom.powerupToast.classList.add('hidden');

      this.updateHud();
      this.state = STATE.PLAYING;
    }

    goToHomeScreen() {
      this.state = STATE.START;
      this.score = 0;
      this.combo = 1;
      this.maxCombo = 1;
      this.lives = 3;
      this.misses = 0;
      this.items = [];
      this.particles = [];
      this.floatingTexts = [];
      this.gameTime = 0;
      this.spawnTimer = 0;
      this.magnetTimer = 0;
      this.screenShake = 0;
      this.player.x = LOGICAL_WIDTH / 2;
      this.player.isInvulnerable = 0;
      this.mouseTargetX = null;
      this.keys.left = false;
      this.keys.right = false;
      this.inputDir = 0;

      this.dom.gameoverScreen.classList.add('hidden');
      this.dom.pauseScreen.classList.add('hidden');
      this.dom.powerupToast.classList.add('hidden');
      this.dom.startScreen.classList.remove('hidden');

      this.updateHud();
      this.updateDevoteeBanner();
      this.initHeroPreview();
    }

    pauseGame() {
      if (this.state !== STATE.PLAYING) return;
      this.state = STATE.PAUSED;
      document.getElementById('pause-score').textContent = this.score;
      document.getElementById('pause-combo').textContent = `${this.combo}x`;
      this.dom.pauseScreen.classList.remove('hidden');
    }

    resumeGame() {
      if (this.state !== STATE.PAUSED) return;
      this.dom.pauseScreen.classList.add('hidden');
      this.state = STATE.PLAYING;
      this.lastTime = performance.now();
    }

    gameOver() {
      this.state = STATE.GAMEOVER;
      window.soundEngine.playGameOver();

      const isNewRecord = this.score > this.highScore;
      if (isNewRecord) {
        this.highScore = this.score;
        localStorage.setItem(HIGH_SCORE_KEY, this.highScore.toString());
      }

      // Synchronize with global Supabase leaderboard!
      if (window.leaderboardService) {
        window.leaderboardService.syncScore(this.score, this.maxCombo);
      }

      this.dom.finalScore.textContent = this.score;
      this.dom.finalCombo.textContent = `${this.maxCombo}x`;
      this.dom.finalHighScore.textContent = this.highScore;
      this.dom.newHighBadge.classList.toggle('hidden', !isNewRecord);

      // Random encouraging quote
      const quote = FESTIVE_QUOTES[Math.floor(Math.random() * FESTIVE_QUOTES.length)];
      this.dom.gameoverQuote.textContent = quote;

      this.dom.gameoverScreen.classList.remove('hidden');
    }

    // --- Spawner Logic with Progressive Difficulty ---
    updateSpawning(dt) {
      this.spawnTimer += dt;
      // Spawn interval shortens gradually as score climbs
      const currentInterval = Math.max(0.65, this.spawnInterval - (this.score / 500) * 0.45);

      if (this.spawnTimer >= currentInterval) {
        this.spawnTimer = 0;
        this.spawnRandomItem();
      }
    }

    spawnRandomItem() {
      const margin = 50;
      const x = margin + Math.random() * (LOGICAL_WIDTH - margin * 2);

      // Current fall speed increases gradually
      const speed = this.baseFallSpeed + Math.min(this.score / 200, 4.5) + (Math.random() * 0.8);

      // Decide type based on probabilities & score
      const rand = Math.random();
      let type = 'steamed';

      // Obstacle chance starts at 15% and ramps up to 35%
      const obstacleChance = Math.min(0.35, 0.15 + (this.score / 600) * 0.18);

      if (rand < obstacleChance) {
        // Obstacle: Coconut or mischievous Crow (appears early and scales up)
        type = (Math.random() > 0.40 && (this.score > 20 || this.gameTime > 10)) ? 'crow' : 'coconut';
      } else {
        // Collectibles: Steamed, Golden, or Maha
        const modakRand = Math.random();
        if (modakRand < 0.12 && this.score > 80) {
          type = 'maha'; // Rare divine modak
        } else if (modakRand < 0.38) {
          type = 'fried'; // Golden fried modak
        } else {
          type = 'steamed';
        }
      }

      this.items.push(new FallingItem(type, x, speed));
    }

    // --- Catch & Collision Handling ---
    checkCollisions() {
      // Dual hitboxes to ensure full vertical coverage:
      // 1. Lord Ganesha (Mukuta crown, halo, ears, face & torso seated atop Mushak)
      // 2. Mushak (Offering plate, paws, body & feet)
      const hitboxes = [
        {
          x: this.player.x - 44,
          y: this.player.y - 124,
          w: 88,
          h: 80
        },
        {
          x: this.player.x - 52,
          y: this.player.y - 56,
          w: 104,
          h: 70
        }
      ];

      for (let i = this.items.length - 1; i >= 0; i--) {
        const item = this.items[i];

        // Check collision against either Ganesha's upper hitbox or Mushak's lower hitbox
        let collided = false;
        for (let b = 0; b < hitboxes.length; b++) {
          const box = hitboxes[b];
          const closeX = Math.max(box.x, Math.min(item.x, box.x + box.w));
          const closeY = Math.max(box.y, Math.min(item.y, box.y + box.h));
          const distX = item.x - closeX;
          const distY = item.y - closeY;
          if ((distX * distX + distY * distY) < (item.radius * item.radius)) {
            collided = true;
            break;
          }
        }

        if (collided) {
          // Collision Detected!
          if (item.isObstacle) {
            this.handleObstacleHit(item);
          } else {
            this.handleModakCatch(item);
          }
          this.items.splice(i, 1);
          continue;
        }

        // Check if item fell past the ground
        if (item.y > GROUND_Y + 25) {
          if (!item.isObstacle) {
            this.handleMissedModak(item);
          } else if (item.type === 'coconut') {
            // Coconut cracked on floor particle effect
            this.createHitSparks(item.x, GROUND_Y, '#78431e', 8);
          }
          this.items.splice(i, 1);
        }
      }
    }

    handleModakCatch(item) {
      this.player.isEating = 0.35; // Trigger chomping animation

      let basePoints = 10;
      let floatingColor = '#ffd700';

      if (item.type === 'steamed') {
        basePoints = 10;
        window.soundEngine.playCatch(this.combo);
        this.createHitSparks(item.x, item.y, '#ffd700', 12);
      } else if (item.type === 'fried') {
        basePoints = 25;
        floatingColor = '#f59e0b';
        window.soundEngine.playGoldenCatch();
        this.createHitSparks(item.x, item.y, '#f59e0b', 18, 'star');
      } else if (item.type === 'maha') {
        basePoints = 50;
        floatingColor = '#e11d48';
        window.soundEngine.playMahaCatch();
        this.createHitSparks(item.x, item.y, '#ffd700', 25, 'star');
        
        // Restore 1 life if below max
        if (this.lives < 3) {
          this.lives++;
          this.floatingTexts.push(new FloatingText("LIFE RESTORED! 🪔", this.player.x, this.player.y - 70, '#10b981', 22));
        }

        // Activate Modak Magnet Power-up for 5 seconds
        this.magnetTimer = 5.0;
        this.dom.powerupToast.classList.remove('hidden');
        this.dom.powerupText.textContent = "MAHA PRASADAM! MAGNET ACTIVE";
      }

      // Add to score with combo multiplier
      const earned = basePoints * this.combo;
      this.score += earned;

      // Increase combo
      this.combo = Math.min(5, this.combo + 1);
      if (this.combo > this.maxCombo) {
        this.maxCombo = this.combo;
      }

      // Floating text indicator
      const textLabel = this.combo > 1 ? `+${earned} (${this.combo}x)` : `+${earned}`;
      this.floatingTexts.push(new FloatingText(textLabel, item.x, item.y - 10, floatingColor, 20 + this.combo * 2));

      // Combo bounce animation in DOM
      this.dom.comboContainer.classList.add('bounce');
      setTimeout(() => this.dom.comboContainer.classList.remove('bounce'), 160);

      this.updateHud();
    }

    handleMissedModak(item) {
      window.soundEngine.playMiss();
      this.createHitSparks(item.x, GROUND_Y, '#dfd1b8', 6);
      this.floatingTexts.push(new FloatingText("Miss!", item.x, GROUND_Y - 20, '#ef4444', 16));

      // Reset Combo
      this.combo = 1;
      this.misses++;

      // If 3 modaks are missed, lose 1 life!
      if (this.misses >= 3) {
        this.misses = 0;
        this.loseLife("3 Dropped Modaks!");
      }

      this.updateHud();
    }

    handleObstacleHit(obstacle) {
      if (this.player.isInvulnerable > 0) return;

      window.soundEngine.playHit();
      this.screenShake = 0.35;

      if (obstacle.type === 'crow') {
        // Mischievous crow feathers + impact sparks
        this.createHitSparks(obstacle.x, obstacle.y, '#18181b', 16);
        this.createHitSparks(obstacle.x, obstacle.y, '#ef4444', 12);
      } else {
        this.createHitSparks(obstacle.x, obstacle.y, '#78431e', 14);
        this.createHitSparks(obstacle.x, obstacle.y, '#ef4444', 12);
      }

      this.loseLife(obstacle.type === 'crow' ? "Crow Collision!" : "Coconut Bonk!");
    }

    loseLife(reason) {
      this.lives--;
      this.combo = 1;
      this.player.isInvulnerable = 0.85; // 0.85 seconds invulnerability buffer
      window.soundEngine.playLifeLost();

      this.floatingTexts.push(new FloatingText("-1 LIFE!", this.player.x, this.player.y - 70, '#ef4444', 26));

      this.updateHud();

      if (this.lives <= 0) {
        this.gameOver();
      }
    }

    // Visual Particle Burst
    createHitSparks(x, y, color, count, shape = 'circle') {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 5;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed - 1.5;
        const size = 3 + Math.random() * 4;
        const life = 0.4 + Math.random() * 0.4;
        this.particles.push(new Particle(x, y, vx, vy, color, size, life, shape));
      }
    }

    // Synchronize HUD DOM elements
    updateHud() {
      if (this.dom.score) this.dom.score.textContent = this.score;
      if (this.dom.combo) this.dom.combo.textContent = `${this.combo}x`;
      if (this.dom.startHighScore) this.dom.startHighScore.textContent = this.highScore;

      // Update Miss Meter Dots
      if (this.dom.missDots) {
        this.dom.missDots.forEach((dot, idx) => {
          if (dot) dot.classList.toggle('filled', idx < this.misses);
        });
      }

      // Update Diyas (Lives)
      if (this.dom.lifeDiyas) {
        this.dom.lifeDiyas.forEach((diya, idx) => {
          if (diya) diya.classList.toggle('lost', idx >= this.lives);
        });
      }
    }

    // --- Main Game Loop (60 FPS) ---
    gameLoop(now) {
      const dt = Math.min((now - this.lastTime) / 1000, 0.05); // Cap delta time
      this.lastTime = now;

      this.update(dt);
      this.render();

      requestAnimationFrame(this.gameLoop.bind(this));
    }

    update(dt) {
      this.gameTime += dt;

      // Handle Screen Shake
      if (this.screenShake > 0) {
        this.screenShake -= dt;
      }

      // Handle Magnet Power-up timer
      if (this.magnetTimer > 0) {
        this.magnetTimer -= dt;
        if (this.magnetTimer <= 0) {
          this.dom.powerupToast.classList.add('hidden');
        }
      }

      // Update Ambient Petals
      this.ambientPetals.forEach(p => {
        p.y += p.speed * dt * 60;
        p.phase += p.swaySpeed * dt;
        p.x += Math.sin(p.phase) * p.swayAmp * dt * 60;

        if (p.y > LOGICAL_HEIGHT + 20) {
          p.y = -20;
          p.x = Math.random() * LOGICAL_WIDTH;
        }
      });

      if (this.state === STATE.PLAYING) {
        this.player.update(dt, this.inputDir, this.mouseTargetX);
        this.updateSpawning(dt);

        // Update Falling Items
        const isMagnet = this.magnetTimer > 0;
        for (let i = 0; i < this.items.length; i++) {
          this.items[i].update(dt, this.player, isMagnet);
        }

        this.checkCollisions();
      }

      // Update Particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        if (!this.particles[i].update(dt)) {
          this.particles.splice(i, 1);
        }
      }

      // Update Floating Texts
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        if (!this.floatingTexts[i].update(dt)) {
          this.floatingTexts.splice(i, 1);
        }
      }
    }

    // --- Render Pipeline ---
    render() {
      this.ctx.save();
      this.ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

      // Apply screen shake if active
      if (this.screenShake > 0) {
        const shakeMag = this.screenShake * 16;
        const sx = (Math.random() - 0.5) * shakeMag;
        const sy = (Math.random() - 0.5) * shakeMag;
        this.ctx.translate(sx, sy);
      }

      // 1. Draw Festive Temple Backdrop
      this.drawFestiveBackdrop();

      // 2. Draw Ambient Floating Petals
      this.drawAmbientPetals();

      // 3. Draw Hanging Festive Toran at Top
      this.drawHangingToran();

      // 4. Draw Falling Items (Modaks & Obstacles)
      for (let i = 0; i < this.items.length; i++) {
        this.items[i].draw(this.ctx);
      }

      // 5. Draw Mushak (Player)
      this.player.draw(this.ctx);

      // 6. Draw Flickering Temple Diyas on Bottom Railing
      this.drawBottomDiyas();

      // 7. Draw Particles & Explosions
      for (let i = 0; i < this.particles.length; i++) {
        this.particles[i].draw(this.ctx);
      }

      // 8. Draw Floating Numbers & Combo Text
      for (let i = 0; i < this.floatingTexts.length; i++) {
        this.floatingTexts[i].draw(this.ctx);
      }

      this.ctx.restore();
    }

    // Rich Festive Background Graphics
    drawFestiveBackdrop() {
      const ctx = this.ctx;

      // Celestial Night Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
      skyGrad.addColorStop(0, '#0c0717');
      skyGrad.addColorStop(0.5, '#1e1136');
      skyGrad.addColorStop(1, '#2f1954');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

      // Auspicious Glowing Moon with Divine Halo
      const moonX = LOGICAL_WIDTH / 2;
      const moonY = 140;
      const haloGrad = ctx.createRadialGradient(moonX, moonY, 15, moonX, moonY, 120);
      haloGrad.addColorStop(0, 'rgba(255, 235, 170, 0.4)');
      haloGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.15)');
      haloGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 120, 0, Math.PI * 2);
      ctx.fill();

      // Full Moon
      ctx.fillStyle = '#fffdf0';
      ctx.beginPath();
      ctx.arc(moonX, moonY, 34, 0, Math.PI * 2);
      ctx.fill();

      // Distant Temple Silhouette (Shikharas & Flags)
      ctx.fillStyle = 'rgba(18, 9, 36, 0.75)';
      ctx.beginPath();
      ctx.moveTo(0, 680);
      // Left Shikhara
      ctx.lineTo(80, 520);
      ctx.lineTo(120, 680);
      // Center Main Grand Temple Shikhara
      ctx.lineTo(LOGICAL_WIDTH / 2 - 50, 480);
      ctx.lineTo(LOGICAL_WIDTH / 2, 380); // Peak
      ctx.lineTo(LOGICAL_WIDTH / 2 + 50, 480);
      // Right Shikhara
      ctx.lineTo(LOGICAL_WIDTH - 120, 680);
      ctx.lineTo(LOGICAL_WIDTH - 80, 520);
      ctx.lineTo(LOGICAL_WIDTH, 680);
      ctx.lineTo(LOGICAL_WIDTH, GROUND_Y);
      ctx.lineTo(0, GROUND_Y);
      ctx.closePath();
      ctx.fill();

      // Fluttering Saffron Flags on Temple Peaks
      const flagWave = Math.sin(this.gameTime * 4) * 4;
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(LOGICAL_WIDTH / 2, 380);
      ctx.lineTo(LOGICAL_WIDTH / 2 + 24 + flagWave, 388);
      ctx.lineTo(LOGICAL_WIDTH / 2, 396);
      ctx.closePath();
      ctx.fill();

      // Temple Floor / Courtyard
      const floorGrad = ctx.createLinearGradient(0, GROUND_Y - 20, 0, LOGICAL_HEIGHT);
      floorGrad.addColorStop(0, '#2b1649');
      floorGrad.addColorStop(0.3, '#1c0e30');
      floorGrad.addColorStop(1, '#0e0618');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, GROUND_Y - 20, LOGICAL_WIDTH, LOGICAL_HEIGHT - (GROUND_Y - 20));

      // Golden Rangoli Geometric Border on Floor
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y - 20);
      ctx.lineTo(LOGICAL_WIDTH, GROUND_Y - 20);
      ctx.stroke();

      // Traditional Floor Rangoli Circles in Center
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.18)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(LOGICAL_WIDTH / 2, GROUND_Y + 40, 70, 0, Math.PI * 2);
      ctx.arc(LOGICAL_WIDTH / 2, GROUND_Y + 40, 110, 0, Math.PI * 2);
      ctx.stroke();

      // Side Temple Carved Stone Pillars
      this.drawPillar(0, true);
      this.drawPillar(LOGICAL_WIDTH - 38, false);
    }

    // Carved Temple Stone Pillars on sides
    drawPillar(x, isLeft) {
      const ctx = this.ctx;
      const w = 38;

      const pGrad = ctx.createLinearGradient(x, 0, x + w, 0);
      pGrad.addColorStop(0, isLeft ? '#3e206b' : '#22113d');
      pGrad.addColorStop(0.5, '#4a2880');
      pGrad.addColorStop(1, isLeft ? '#22113d' : '#3e206b');

      ctx.fillStyle = pGrad;
      ctx.fillRect(x, 0, w, GROUND_Y - 20);

      // Carved gold flutes
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.25)';
      ctx.lineWidth = 1.5;
      for (let y = 100; y < GROUND_Y - 50; y += 45) {
        ctx.strokeRect(x + 4, y, w - 8, 28);
      }
    }

    // Hanging Festive Toran (Marigold & Mango Leaves) at Top
    drawHangingToran() {
      const ctx = this.ctx;
      const garlandY = 64;

      // Swag ropes with marigold flowers
      const points = 7;
      const segmentW = LOGICAL_WIDTH / points;

      for (let i = 0; i < points; i++) {
        const startX = i * segmentW;
        const endX = (i + 1) * segmentW;
        const midX = (startX + endX) / 2;
        const sag = 28 + Math.sin(this.gameTime * 2 + i) * 2;

        // Mango Leaf (fresh green leaf hanging in center of each swag)
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.ellipse(midX, garlandY + sag - 6, 7, 16, 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Curved thread
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, garlandY);
        ctx.quadraticCurveTo(midX, garlandY + sag, endX, garlandY);
        ctx.stroke();

        // Hanging Marigold flowers (Orange & Yellow alternates)
        for (let t = 0; t <= 1; t += 0.25) {
          const fx = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * endX;
          const fy = (1 - t) * (1 - t) * garlandY + 2 * (1 - t) * t * (garlandY + sag) + t * t * garlandY;

          const isOrange = (i + Math.floor(t * 4)) % 2 === 0;
          ctx.fillStyle = isOrange ? '#ea580c' : '#fbbf24';
          ctx.beginPath();
          ctx.arc(fx, fy, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Flickering Temple Diyas along the bottom ledge
    drawBottomDiyas() {
      const ctx = this.ctx;
      const diyaPositions = [70, 160, 380, 470];

      diyaPositions.forEach((dx, idx) => {
        const dy = GROUND_Y - 14;
        const flameFlicker = Math.sin(this.gameTime * 10 + idx * 2) * 2;
        const flameScale = 1 + Math.sin(this.gameTime * 14 + idx) * 0.12;

        // Warm Golden Glow on ground
        const glow = ctx.createRadialGradient(dx, dy - 10, 4, dx, dy - 10, 45);
        glow.addColorStop(0, 'rgba(255, 180, 50, 0.45)');
        glow.addColorStop(0.5, 'rgba(245, 158, 11, 0.15)');
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(dx, dy - 10, 45, 0, Math.PI * 2);
        ctx.fill();

        // Clay Diya Base (Earthen mitti bowl)
        ctx.fillStyle = '#b45309';
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(dx, dy, 14, 6, 0, 0, Math.PI);
        ctx.fill();
        ctx.stroke();

        // Dancing Diya Flame
        ctx.save();
        ctx.translate(dx, dy - 6);
        ctx.scale(flameScale, flameScale);

        // Outer Orange Flame
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.moveTo(-5, 0);
        ctx.quadraticCurveTo(-6, -12, 0 + flameFlicker, -18);
        ctx.quadraticCurveTo(6, -12, 5, 0);
        ctx.closePath();
        ctx.fill();

        // Inner Bright Yellow Core
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.moveTo(-2.5, 0);
        ctx.quadraticCurveTo(-3, -7, 0 + flameFlicker * 0.5, -11);
        ctx.quadraticCurveTo(3, -7, 2.5, 0);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      });
    }

    // Ambient Floating Petals (Marigold & Lotus)
    drawAmbientPetals() {
      const ctx = this.ctx;
      this.ambientPetals.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.phase);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 1.5, p.size * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }
  }

  // Launch Engine when DOM is ready
  window.addEventListener('DOMContentLoaded', () => {
    window.gameInstance = new GameEngine();
  });

})();
