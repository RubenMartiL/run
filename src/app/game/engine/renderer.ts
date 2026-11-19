import { WorldTheme } from '../data/worlds';
import { gateColor, gateVisual } from '../gates';
import { obstacleMotion } from './obstacle-motion';
import { GameView, ParticleView } from './view';

const ROAD_LEFT = 100;
const ROAD_RIGHT = 900;
const ROAD_WIDTH = ROAD_RIGHT - ROAD_LEFT;

function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Pure Canvas 2D renderer. All artwork is procedural so the game has zero
 * asset dependencies; sprites can later replace individual `draw*` methods.
 */
export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, width: number, height: number, view: GameView): void {
    const scale = width / 1000;
    const viewHeight = height / scale;
    const battleLift = view.battle ? Math.min(1, view.battle.elapsed / 0.7) : 0;
    const anchor = 0.335 + 0.165 * battleLift;
    const camY = view.distance - viewHeight * anchor;

    const toY = (worldY: number) => height - (worldY - camY) * scale;

    ctx.save();
    ctx.translate(view.shakeX * scale, view.shakeY * scale);

    const zoom = 1 + (view.battle ? Math.min(1, view.battle.elapsed / 0.8) * 0.045 : 0);
    if (zoom !== 1) {
      ctx.translate(width / 2, height / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-width / 2, -height / 2);
    }

    this.drawSky(ctx, width, height, view.theme, view);
    this.drawGround(ctx, width, height, view, camY, viewHeight, scale, toY);
    this.drawRoad(ctx, width, height, view, camY, viewHeight, scale, toY);
    this.drawSpeedLines(ctx, width, height, view);
    this.drawScenery(ctx, width, height, view, camY, viewHeight, scale, toY);
    this.drawFinish(ctx, width, height, view, scale, toY);
    this.drawCoins(ctx, view, scale, toY);
    this.drawMagnetTrails(ctx, view, scale, toY);
    this.drawObstacles(ctx, view, scale, toY);
    this.drawGates(ctx, view, scale, toY);
    this.drawCrowd(ctx, view, scale, toY);
    this.drawEnemy(ctx, width, view, scale, toY);
    this.drawParticles(ctx, view, scale, toY);
    this.drawPopups(ctx, view, scale, toY);
    this.drawVignette(ctx, width, height);
    this.drawCombo(ctx, width, height, view);
    this.drawFlash(ctx, width, height, view);

    ctx.restore();
  }

  // -------------------------------------------------------------- background

  private drawSky(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    theme: WorldTheme,
    view: GameView,
  ): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, theme.skyTop);
    gradient.addColorStop(1, theme.skyBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Soft colour blobs for depth (cheap, no per-frame gradient churn beyond two).
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(width * 0.18, height * 0.18, width * 0.34, height * 0.14, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(width * 0.86, height * 0.34, width * 0.28, height * 0.1, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Floating ambient specks that never affect gameplay.
    const count = 10;
    for (let i = 0; i < count; i++) {
      const t = view.time * 0.25 + i * 1.7;
      const x = ((hash(i) * 1.4 - 0.2) * width + Math.sin(t) * 16 + width) % width;
      const y = ((hash(i + 20) * height + view.time * 8) % height);
      ctx.globalAlpha = 0.2 + hash(i + 7) * 0.2;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 1.5 + hash(i + 9) * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawGround(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    view: GameView,
    camY: number,
    viewHeight: number,
    scale: number,
    toY: (worldY: number) => number,
  ): void {
    ctx.fillStyle = view.theme.ground;
    ctx.fillRect(0, 0, width, height);

    // Alternating bands sell forward motion on the ground.
    const band = 220;
    const first = Math.floor(camY / band) - 1;
    const bands = Math.ceil(viewHeight / band) + 3;
    for (let i = 0; i < bands; i++) {
      const index = first + i;
      if (index % 2 === 0) continue;
      const y = toY(index * band);
      ctx.fillStyle = view.theme.groundAlt;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(0, y, width, band * scale);
    }
    ctx.globalAlpha = 1;
  }

  private drawRoad(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    view: GameView,
    camY: number,
    viewHeight: number,
    scale: number,
    toY: (worldY: number) => number,
  ): void {
    const left = ROAD_LEFT * scale;
    const roadWidth = ROAD_WIDTH * scale;

    ctx.fillStyle = view.theme.road;
    ctx.fillRect(left, 0, roadWidth, height);

    // Inner track sheen.
    const sheen = ctx.createLinearGradient(left, 0, left + roadWidth, 0);
    sheen.addColorStop(0, 'rgba(255,255,255,0.14)');
    sheen.addColorStop(0.5, 'rgba(255,255,255,0.02)');
    sheen.addColorStop(1, 'rgba(255,255,255,0.14)');
    ctx.fillStyle = sheen;
    ctx.fillRect(left, 0, roadWidth, height);

    // Motion seams across the track.
    const seam = 260;
    const first = Math.floor(camY / seam) - 1;
    const count = Math.ceil(viewHeight / seam) + 3;
    ctx.fillStyle = view.theme.roadEdge;
    for (let i = 0; i < count; i++) {
      const y = toY((first + i) * seam);
      ctx.globalAlpha = 0.08;
      ctx.fillRect(left + 8, y, roadWidth - 16, 2);
    }
    ctx.globalAlpha = 1;

    // Lane divider dashes.
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = Math.max(2, 5 * scale);
    ctx.setLineDash([26 * scale, 30 * scale]);
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Curbs with candy stripes.
    const curbWidth = 14 * scale;
    for (const x of [left - curbWidth, left + roadWidth]) {
      ctx.fillStyle = view.theme.roadEdge;
      ctx.fillRect(x, 0, curbWidth, height);
      const stripe = 54;
      const firstStripe = Math.floor(camY / stripe) - 1;
      const stripeCount = Math.ceil(viewHeight / stripe) + 3;
      ctx.fillStyle = view.theme.accent;
      ctx.globalAlpha = 0.7;
      for (let i = 0; i < stripeCount; i++) {
        if ((firstStripe + i) % 2 !== 0) continue;
        ctx.fillRect(x, toY((firstStripe + i) * stripe), curbWidth, stripe * scale * 0.5);
      }
      ctx.globalAlpha = 1;
    }
  }

  private drawScenery(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    view: GameView,
    camY: number,
    viewHeight: number,
    scale: number,
    toY: (worldY: number) => number,
  ): void {
    const spacing = 280;
    const first = Math.floor((camY - 300) / spacing);
    const count = Math.ceil(viewHeight / spacing) + 4;

    for (let i = 0; i < count; i++) {
      const index = first + i;
      const worldY = index * spacing + hash(index) * 120;
      const y = toY(worldY);
      if (y < -220 || y > height + 220) continue;

      const flip = hash(index + 5) > 0.5;
      const sway = Math.sin(view.time * 1.8 + index * 1.3) * 5 * scale;
      const swayRight = Math.cos(view.time * 1.6 + index * 0.9) * 5 * scale;

      this.drawDecoration(ctx, view.theme, 52 * scale, y + sway, scale, index, flip, false);
      this.drawDecoration(ctx, view.theme, 948 * scale, y + 90 * scale + swayRight, scale, index + 91, !flip, true);
    }

    // Ambient floating orbs give the sides constant motion without DOM cost.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const seed = i * 13.7;
      const x = (hash(seed) < 0.5 ? 0.02 + hash(seed + 2) * 0.06 : 0.92 + hash(seed + 2) * 0.06) * width;
      const range = height + 80;
      const y = ((view.time * (20 + hash(seed + 4) * 30) + hash(seed + 6) * range) % range) - 40;
      ctx.globalAlpha = 0.1 + hash(seed + 8) * 0.16;
      ctx.fillStyle = view.theme.glow;
      ctx.beginPath();
      ctx.arc(x, y, (3 + hash(seed + 9) * 6) * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawDecoration(
    ctx: CanvasRenderingContext2D,
    theme: WorldTheme,
    x: number,
    y: number,
    scale: number,
    seed: number,
    flip: boolean,
    right: boolean,
  ): void {
    const s = scale * (0.85 + hash(seed + 3) * 0.4);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip ? -s : s, s);

    const variant = Math.floor(hash(seed + 11) * 3);

    switch (theme.scenery) {
      case 'city': {
        if (variant === 0) {
          ctx.fillStyle = theme.accentDeep;
          ctx.globalAlpha = 0.25;
          ctx.fillRect(-20, -70, 74, 170);
          ctx.globalAlpha = 1;
          ctx.fillStyle = theme.accentDeep;
          ctx.fillRect(-26, -92, 62, 160);
          ctx.fillStyle = theme.glow;
          ctx.globalAlpha = 0.7;
          for (let i = 0; i < 3; i++) {
            ctx.fillRect(-15, -78 + i * 38, 14, 16);
            ctx.fillRect(8, -78 + i * 38, 14, 16);
          }
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = '#8b5a2b';
          ctx.fillRect(-6, -20, 12, 40);
          ctx.fillStyle = theme.accent;
          ctx.beginPath();
          ctx.arc(0, -42, 34, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = theme.glow;
          ctx.beginPath();
          ctx.arc(-12, -52, 16, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'desert': {
        if (variant === 0) {
          ctx.fillStyle = theme.accentDeep;
          ctx.fillRect(-8, -48, 16, 52);
          ctx.fillRect(-30, -34, 12, 24);
          ctx.fillRect(18, -26, 12, 18);
          ctx.fillStyle = theme.accent;
          ctx.beginPath();
          ctx.arc(0, -52, 10, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = theme.accentDeep;
          ctx.beginPath();
          ctx.ellipse(0, 0, 34, 20, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = theme.accent;
          ctx.globalAlpha = 0.6;
          ctx.beginPath();
          ctx.ellipse(-8, -8, 20, 12, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        break;
      }
      case 'frost': {
        ctx.fillStyle = theme.accentDeep;
        ctx.beginPath();
        ctx.moveTo(0, -90);
        ctx.lineTo(26, -20);
        ctx.lineTo(14, -12);
        ctx.lineTo(0, -40);
        ctx.lineTo(-14, -12);
        ctx.lineTo(-26, -20);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.moveTo(0, -86);
        ctx.lineTo(14, -38);
        ctx.lineTo(0, -54);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
      case 'jungle': {
        ctx.fillStyle = theme.accentDeep;
        ctx.fillRect(-7, -34, 14, 44);
        ctx.fillStyle = theme.accent;
        for (let i = 0; i < 3; i++) {
          ctx.save();
          ctx.rotate((i - 1) * 0.7);
          ctx.beginPath();
          ctx.ellipse(0, -48, 12, 34, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.fillStyle = theme.glow;
        ctx.beginPath();
        ctx.arc(-14, -62, 6, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'candy': {
        if (variant === 0) {
          ctx.strokeStyle = theme.accent;
          ctx.lineWidth = 14;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -70);
          ctx.stroke();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(-4, -8);
          ctx.lineTo(4, -26);
          ctx.moveTo(4, -32);
          ctx.lineTo(-4, -50);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, -70, 18, 0, Math.PI);
          ctx.stroke();
        } else {
          ctx.fillStyle = theme.accentDeep;
          ctx.fillRect(-5, -55, 10, 60);
          ctx.fillStyle = theme.accent;
          ctx.beginPath();
          ctx.arc(0, -66, 28, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(0, -66, 14, 0, Math.PI * 1.5);
          ctx.stroke();
        }
        break;
      }
      case 'lava': {
        ctx.fillStyle = '#2b1310';
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.lineTo(-18, -46);
        ctx.lineTo(4, -62);
        ctx.lineTo(26, -30);
        ctx.lineTo(30, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = theme.accent;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.ellipse(0, -6, 30, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
      case 'neon': {
        const h = 80 + hash(seed) * 90;
        ctx.fillStyle = theme.accentDeep;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(-22, -h, 44, h);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 4;
        ctx.shadowColor = theme.accent;
        ctx.shadowBlur = 16;
        ctx.strokeRect(-22, -h, 44, h);
        ctx.beginPath();
        ctx.moveTo(-14, -h + 20);
        ctx.lineTo(14, -h + 20);
        ctx.stroke();
        ctx.shadowBlur = 0;
        break;
      }
      case 'pirate': {
        ctx.fillStyle = '#7a4a22';
        ctx.fillRect(-6, -44, 12, 50);
        ctx.fillStyle = theme.accent;
        for (let i = 0; i < 3; i++) {
          ctx.save();
          ctx.rotate((i - 1) * 0.9);
          ctx.beginPath();
          ctx.ellipse(0, -54, 10, 30, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        break;
      }
      case 'space': {
        ctx.fillStyle = theme.accentDeep;
        ctx.beginPath();
        ctx.moveTo(0, -75);
        ctx.lineTo(20, -10);
        ctx.lineTo(8, 0);
        ctx.lineTo(0, -20);
        ctx.lineTo(-8, 0);
        ctx.lineTo(-20, -10);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = theme.accent;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(0, -44, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
      case 'kingdom': {
        ctx.fillStyle = theme.accentDeep;
        ctx.fillRect(-20, -70, 40, 76);
        ctx.fillStyle = theme.accent;
        ctx.beginPath();
        ctx.moveTo(-24, -70);
        ctx.lineTo(-24, -92);
        ctx.lineTo(-10, -80);
        ctx.lineTo(0, -96);
        ctx.lineTo(10, -80);
        ctx.lineTo(24, -92);
        ctx.lineTo(24, -70);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = theme.glow;
        ctx.fillRect(-14, -56, 8, 10);
        ctx.fillRect(6, -56, 8, 10);
        break;
      }
    }

    if (right) ctx.scale(-1, 1);
    ctx.restore();
  }

  // ------------------------------------------------------------------ finish

  private drawFinish(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    view: GameView,
    scale: number,
    toY: (worldY: number) => number,
  ): void {
    const y = toY(view.finishY);
    if (y < -120 || y > height + 260) return;

    const left = ROAD_LEFT * scale;
    const roadWidth = ROAD_WIDTH * scale;
    const bandHeight = 54 * scale;

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.92;
    ctx.fillRect(left, y - bandHeight, roadWidth, bandHeight);
    ctx.globalAlpha = 1;

    const tile = roadWidth / 12;
    ctx.fillStyle = '#1c2436';
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 12; col++) {
        if ((row + col) % 2 === 0) continue;
        ctx.fillRect(left + col * tile, y - bandHeight + row * (bandHeight / 2), tile, bandHeight / 2);
      }
    }

    ctx.fillStyle = view.theme.accentDeep;
    ctx.font = `800 ${Math.max(11, 34 * scale)}px 'Baloo 2', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (view.finishKind === 'boss') {
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 4;
      ctx.strokeText(view.bossName ?? 'BOSS', width / 2, y - bandHeight - 30 * scale);
      ctx.fillText(view.bossName ?? 'BOSS', width / 2, y - bandHeight - 30 * scale);
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------- coins

  private drawCoins(
    ctx: CanvasRenderingContext2D,
    view: GameView,
    scale: number,
    toY: (worldY: number) => number,
  ): void {
    for (const coin of view.coins) {
      if (coin.taken) continue;
      const y = toY(coin.y);
      if (y < -40 || y > ctx.canvas.height + 40) continue;
      const x = coin.x * scale;
      const r = 17 * scale;
      const spin = Math.abs(Math.cos(view.time * 4 + coin.id));
      const width = Math.max(0.25, spin);

      ctx.save();
      ctx.translate(x, y + Math.sin(view.time * 5 + coin.id) * 3 * scale);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(0, r * 1.5, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.scale(width, 1);
      const gradient = ctx.createLinearGradient(-r, -r, r, r);
      gradient.addColorStop(0, '#ffe98a');
      gradient.addColorStop(0.55, '#ffcc33');
      gradient.addColorStop(1, '#e8a300');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a87400';
      ctx.lineWidth = Math.max(1, 2.5 * scale);
      ctx.stroke();
      ctx.fillStyle = '#fff6cc';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.42, r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // --------------------------------------------------------------- obstacles

  private drawObstacles(
    ctx: CanvasRenderingContext2D,
    view: GameView,
    scale: number,
    toY: (worldY: number) => number,
  ): void {
    for (const obstacle of view.obstacles) {
      const screenY = toY(obstacle.y);
      if (screenY < -260 || screenY > ctx.canvas.height + 260) continue;
      const motion = obstacleMotion(
        obstacle.kind,
        obstacle.x,
        obstacle.y,
        obstacle.size,
        obstacle.speed,
        obstacle.phase,
        view.time,
      );
      const x = motion.x * scale;
      const y = toY(motion.y);
      const s = scale;

      ctx.save();
      ctx.translate(x, y);

      // Ground shadow.
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(0, motion.h * s * 0.55, motion.w * s * 0.55, 9 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      if (obstacle.hitFlash > 0.02) {
        ctx.globalAlpha = 0.35 + obstacle.hitFlash * 0.5;
        ctx.fillStyle = '#ff5d5d';
        ctx.beginPath();
        ctx.arc(0, 0, motion.w * s * 0.75, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      switch (obstacle.kind) {
        case 'hammer': {
          const anchorY = toY(motion.anchorY) - y;
          ctx.strokeStyle = '#5a6478';
          ctx.lineWidth = Math.max(2, 6 * s);
          ctx.beginPath();
          ctx.moveTo(0, anchorY);
          ctx.lineTo(0, -motion.h * s * 0.2);
          ctx.stroke();
          ctx.fillStyle = '#3f4759';
          ctx.beginPath();
          ctx.roundRect(-26 * s, anchorY - 8 * s, 52 * s, 12 * s, 6 * s);
          ctx.fill();

          ctx.rotate(motion.angle);
          const headW = motion.w * s;
          const headH = motion.h * s;
          const gradient = ctx.createLinearGradient(-headW / 2, -headH / 2, headW / 2, headH / 2);
          gradient.addColorStop(0, '#9aa6bd');
          gradient.addColorStop(1, '#5d6880');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(-headW / 2, -headH / 2, headW, headH, 10 * s);
          ctx.fill();
          ctx.fillStyle = '#38404f';
          ctx.fillRect(-headW / 2, -headH / 2, headW, headH * 0.22);
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.beginPath();
          ctx.roundRect(-headW / 2 + 5 * s, -headH / 2 + 6 * s, headW * 0.24, headH * 0.16, 4 * s);
          ctx.fill();
          break;
        }
        case 'saw': {
          const radius = motion.w * s * 0.5;
          ctx.rotate(motion.angle);
          ctx.fillStyle = '#c8d2e4';
          ctx.beginPath();
          const teeth = 10;
          for (let i = 0; i < teeth * 2; i++) {
            const angle = (i / (teeth * 2)) * Math.PI * 2;
            const r = i % 2 === 0 ? radius : radius * 0.76;
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#6b7488';
          ctx.lineWidth = Math.max(1, 2 * s);
          ctx.stroke();
          ctx.fillStyle = '#6b7488';
          ctx.beginPath();
          ctx.arc(0, 0, radius * 0.36, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ff7a6b';
          ctx.beginPath();
          ctx.arc(0, 0, radius * 0.16, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'slider':
        case 'barrier': {
          const w = motion.w * s;
          const h = motion.h * s;
          const gradient = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
          gradient.addColorStop(0, view.theme.accent);
          gradient.addColorStop(1, view.theme.accentDeep);
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(-w / 2, -h / 2, w, h, 10 * s);
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.25)';
          ctx.lineWidth = Math.max(1, 2 * s);
          ctx.stroke();
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(-w / 2, -h / 2, w, h, 10 * s);
          ctx.clip();
          ctx.fillStyle = 'rgba(255,255,255,0.32)';
          for (let i = -1; i < 5; i++) {
            ctx.save();
            ctx.rotate(-0.5);
            ctx.fillRect(-w / 2 + i * 22 * s, -h, 8 * s, h * 2);
            ctx.restore();
          }
          ctx.restore();
          break;
        }
        case 'spikes': {
          const w = motion.w * s;
          const h = motion.h * s;
          ctx.fillStyle = '#454f63';
          ctx.beginPath();
          ctx.roundRect(-w / 2, -h * 0.24, w, h * 0.48, 6 * s);
          ctx.fill();
          ctx.fillStyle = '#e6eefc';
          const spikes = Math.max(4, Math.round(motion.w / 34));
          for (let i = 0; i < spikes; i++) {
            const sx = -w / 2 + (i + 0.5) * (w / spikes);
            ctx.beginPath();
            ctx.moveTo(sx - (w / spikes) * 0.42, -h * 0.2);
            ctx.lineTo(sx, -h * 0.62);
            ctx.lineTo(sx + (w / spikes) * 0.42, -h * 0.2);
            ctx.closePath();
            ctx.fill();
          }
          break;
        }
        case 'gap': {
          const w = motion.w * s;
          const h = motion.h * s;
          ctx.fillStyle = 'rgba(6, 10, 18, 0.92)';
          ctx.beginPath();
          ctx.ellipse(0, 0, w * 0.5, h * 0.42, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = view.theme.accent;
          ctx.lineWidth = Math.max(2, 4 * s);
          ctx.setLineDash([12 * s, 10 * s]);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(255, 122, 107, 0.7)';
          ctx.beginPath();
          ctx.ellipse(0, h * 0.05, w * 0.33, h * 0.12, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'ball': {
          const radius = motion.w * s * 0.5;
          ctx.rotate(motion.angle);
          const gradient = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, 1, 0, 0, radius);
          gradient.addColorStop(0, '#c9d5ea');
          gradient.addColorStop(1, '#59637a');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#2b3242';
          for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(
              Math.cos(angle) * radius * 0.55,
              Math.sin(angle) * radius * 0.55,
              radius * 0.18,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
          break;
        }
        case 'crusher': {
          const anchorY = toY(motion.anchorY) - y;
          const w = motion.w * s;
          const h = motion.h * s;
          ctx.strokeStyle = '#3f4759';
          ctx.lineWidth = Math.max(2, 5 * s);
          ctx.beginPath();
          ctx.moveTo(-w * 0.36, anchorY);
          ctx.lineTo(-w * 0.36, -h * 0.4);
          ctx.moveTo(w * 0.36, anchorY);
          ctx.lineTo(w * 0.36, -h * 0.4);
          ctx.stroke();
          ctx.fillStyle = '#3f4759';
          ctx.beginPath();
          ctx.roundRect(-w * 0.5, anchorY - 8 * s, w, 12 * s, 5 * s);
          ctx.fill();
          const gradient = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
          gradient.addColorStop(0, '#8d99b0');
          gradient.addColorStop(1, '#4b556b');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(-w / 2, -h / 2, w, h, 10 * s);
          ctx.fill();
          ctx.fillStyle = 'rgba(255, 212, 71, 0.85)';
          for (let i = 0; i < 3; i++) {
            ctx.fillRect(-w / 2 + 8 * s + i * (w / 3), -h * 0.16, (w / 3) * 0.55, h * 0.32);
          }
          break;
        }
        case 'number': {
          const w = motion.w * s;
          const h = motion.h * s;
          ctx.fillStyle = 'rgba(14, 22, 38, 0.94)';
          ctx.beginPath();
          ctx.roundRect(-w / 2, -h / 2, w, h, 14 * s);
          ctx.fill();
          ctx.strokeStyle = view.theme.accent;
          ctx.lineWidth = Math.max(2, 4 * s);
          ctx.beginPath();
          ctx.roundRect(-w / 2, -h / 2, w, h, 14 * s);
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.font = `800 ${Math.max(18, h * 0.42)}px 'Baloo 2', system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${obstacle.required}`, 0, -h * 0.04);
          ctx.font = `700 ${Math.max(8, h * 0.14)}px 'Baloo 2', system-ui, sans-serif`;
          ctx.fillStyle = 'rgba(190, 210, 240, 0.6)';
          ctx.fillText('CROWD NEEDED', 0, h * 0.3);
          break;
        }
      }
      ctx.restore();
    }
  }

  // ------------------------------------------------------------------- gates

  private drawGates(
    ctx: CanvasRenderingContext2D,
    view: GameView,
    scale: number,
    toY: (worldY: number) => number,
  ): void {
    for (const gate of view.gates) {
      const y = toY(gate.y);
      if (y < -160 || y > ctx.canvas.height + 160) continue;
      const visual = gateVisual(gate.op);
      const colors = gateColor(visual.tone);
      const w = gate.width * scale;
      const h = gate.height * scale;
      const x = gate.x * scale - w / 2;
      const top = y - h / 2;
      const fade = gate.used ? 0.34 : 1;

      ctx.save();
      ctx.globalAlpha = fade;

      if (!gate.used) {
        const breathe = 0.5 + 0.5 * Math.sin(view.time * 4 + gate.y * 0.01);
        ctx.globalAlpha = fade * (0.1 + breathe * 0.12);
        ctx.fillStyle = colors.glow;
        ctx.beginPath();
        ctx.roundRect(
          x - 10 * scale,
          top - 10 * scale,
          w + 20 * scale,
          h + 20 * scale,
          24 * scale,
        );
        ctx.fill();
        ctx.globalAlpha = fade;
      }

      if (gate.flash > 0.02) {
        ctx.globalAlpha = fade * (0.35 + gate.flash * 0.5);
        ctx.fillStyle = colors.glow;
        ctx.beginPath();
        ctx.roundRect(x - 8 * scale, top - 8 * scale, w + 16 * scale, h + 16 * scale, 22 * scale);
        ctx.fill();
        ctx.globalAlpha = fade;
      }

      const fill = ctx.createLinearGradient(x, top, x, top + h);
      fill.addColorStop(0, 'rgba(255,255,255,0.34)');
      fill.addColorStop(1, 'rgba(0,0,0,0.18)');
      ctx.fillStyle = colors.fill;
      ctx.beginPath();
      ctx.roundRect(x, top, w, h, 20 * scale);
      ctx.fill();
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.roundRect(x, top, w, h, 20 * scale);
      ctx.fill();

      ctx.strokeStyle = colors.deep;
      ctx.lineWidth = Math.max(2, 5 * scale);
      ctx.beginPath();
      ctx.roundRect(x, top, w, h, 20 * scale);
      ctx.stroke();

      // Top/bottom light rails.
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.roundRect(x + 12 * scale, top + 8 * scale, w - 24 * scale, 5 * scale, 3 * scale);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = colors.deep;
      ctx.lineWidth = Math.max(2, 6 * scale);
      ctx.font = `800 ${Math.max(13, h * 0.42 * (1 + Math.sin(view.time * 5 + gate.id) * 0.03 + gate.flash * 0.08))}px 'Baloo 2', system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText(visual.label, gate.x * scale, y + h * 0.02);
      ctx.fillText(visual.label, gate.x * scale, y + h * 0.02);

      ctx.restore();
    }
  }

  // ------------------------------------------------------------------- crowd

  private drawCrowd(
    ctx: CanvasRenderingContext2D,
    view: GameView,
    scale: number,
    toY: (worldY: number) => number,
  ): void {
    if (view.crowdCount <= 0) return;
    const baseY = toY(view.distance + 26);
    const cx = view.crowdX * scale;

    this.drawCrowdFormation(
      ctx,
      cx,
      baseY,
      view.crowdCount,
      scale,
      view.time,
      view.skin.primary,
      view.skin.deep,
      view.crowdPop,
      view.phase === 'lost' ? 0.55 : 1,
      view.phase === 'won',
      view.turboTime > 0,
      view.skin.hat,
      view.skin.trail,
    );
  }

  private drawEnemy(
    ctx: CanvasRenderingContext2D,
    width: number,
    view: GameView,
    scale: number,
    toY: (worldY: number) => number,
  ): void {
    const battle = view.battle;
    if (!battle) return;
    const enemyWorldY = view.finishY + (battle.kind === 'boss' ? 150 : 120);
    const y = toY(enemyWorldY);
    if (y < -300 || y > ctx.canvas.height + 300) return;

    ctx.save();
    if (battle.hitFlash > 0.02) {
      const amount = battle.hitFlash * 12 * scale;
      ctx.translate((Math.random() - 0.5) * amount, (Math.random() - 0.5) * amount);
    }

    if (battle.kind === 'barrier') {
      this.drawBarrier(ctx, width / 2, y, scale, battle.enemyHp / battle.enemyMaxHp);
    } else if (battle.kind === 'boss') {
      this.drawBoss(ctx, width / 2, y, scale, view.time, battle);
    } else {
      this.drawCrowdFormation(
        ctx,
        width / 2,
        y,
        battle.enemyCount,
        scale,
        view.time + 2,
        '#ff5d6c',
        '#b52a3a',
        0,
        1,
        false,
        false,
        'none',
        'none',
      );
      this.drawHealthBar(
        ctx,
        width / 2,
        y - 130 * scale,
        380 * scale,
        16 * scale,
        battle.enemyHp / battle.enemyMaxHp,
        '#ff5d6c',
      );
    }

    this.drawHealthBar(
      ctx,
      width / 2,
      toY(view.distance + 26) - 120 * scale,
      380 * scale,
      16 * scale,
      battle.playerHp / battle.playerMaxHp,
      '#5b8cff',
    );
    ctx.restore();
  }

  private drawBoss(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number,
    time: number,
    battle: { enemyHp: number; enemyMaxHp: number; name?: string },
  ): void {
    const bob = Math.sin(time * 3) * 5 * scale;
    const size = 128 * scale;

    ctx.save();
    ctx.translate(x, y + bob);

    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(0, size * 0.62, size * 0.7, size * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#b52a3a';
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.55, size * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff5d6c';
    ctx.beginPath();
    ctx.ellipse(-size * 0.08, -size * 0.12, size * 0.42, size * 0.46, 0, 0, Math.PI * 2);
    ctx.fill();

    // Crown.
    ctx.fillStyle = '#ffd447';
    ctx.beginPath();
    ctx.moveTo(-size * 0.4, -size * 0.5);
    ctx.lineTo(-size * 0.4, -size * 0.78);
    ctx.lineTo(-size * 0.2, -size * 0.62);
    ctx.lineTo(0, -size * 0.9);
    ctx.lineTo(size * 0.2, -size * 0.62);
    ctx.lineTo(size * 0.4, -size * 0.78);
    ctx.lineTo(size * 0.4, -size * 0.5);
    ctx.closePath();
    ctx.fill();

    // Angry face.
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-size * 0.18, -size * 0.08, size * 0.12, size * 0.14, 0, 0, Math.PI * 2);
    ctx.ellipse(size * 0.18, -size * 0.08, size * 0.12, size * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#22121a';
    ctx.beginPath();
    ctx.arc(-size * 0.16, -size * 0.05, size * 0.055, 0, Math.PI * 2);
    ctx.arc(size * 0.2, -size * 0.05, size * 0.055, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#22121a';
    ctx.lineWidth = Math.max(2, 4 * scale);
    ctx.beginPath();
    ctx.moveTo(-size * 0.08, size * 0.2);
    ctx.quadraticCurveTo(0, size * 0.1, size * 0.08, size * 0.2);
    ctx.stroke();

    ctx.restore();

    if (battle.name) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = `800 ${Math.max(12, 30 * scale)}px 'Baloo 2', system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 4;
      ctx.strokeText(battle.name, x, y - size * 1.2);
      ctx.fillText(battle.name, x, y - size * 1.2);
      ctx.restore();
    }

    this.drawHealthBar(
      ctx,
      x,
      y - size * 1.45,
      420 * scale,
      20 * scale,
      battle.enemyHp / battle.enemyMaxHp,
      '#ff5d6c',
    );
  }

  private drawBarrier(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number,
    ratio: number,
  ): void {
    const w = 420 * scale;
    const h = 110 * scale;
    const clamped = Math.max(0, Math.min(1, ratio));

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(0, h * 0.6, w * 0.5, 14 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    const gradient = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    gradient.addColorStop(0, '#7a879e');
    gradient.addColorStop(1, '#4a5468');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 12 * scale);
    ctx.fill();
    ctx.strokeStyle = '#2c3444';
    ctx.lineWidth = Math.max(2, 4 * scale);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 212, 71, 0.8)';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(-w / 2 + 12 * scale + i * (w / 4), -h * 0.12, (w / 4) * 0.5, h * 0.24);
    }

    // Cracks deepen as the barrier loses HP.
    ctx.strokeStyle = `rgba(20, 26, 38, ${0.25 + (1 - clamped) * 0.6})`;
    ctx.lineWidth = Math.max(1, 3 * scale);
    const cracks = Math.round((1 - clamped) * 5);
    for (let i = 0; i < cracks; i++) {
      const startX = -w / 2 + ((i + 1) / 6) * w;
      ctx.beginPath();
      ctx.moveTo(startX, -h / 2 + 4 * scale);
      ctx.lineTo(startX - 10 * scale, 0);
      ctx.lineTo(startX + 8 * scale, h / 2 - 4 * scale);
      ctx.stroke();
    }

    ctx.restore();

    this.drawHealthBar(
      ctx,
      x,
      y - h * 0.9,
      420 * scale,
      18 * scale,
      clamped,
      '#ffd447',
    );
  }

  private drawHealthBar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    y: number,
    width: number,
    height: number,
    ratio: number,
    color: string,
  ): void {
    const x = cx - width / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(9,14,26,0.65)';
    ctx.beginPath();
    ctx.roundRect(x - 3, y - 3, width + 6, height + 6, height);
    ctx.fill();
    ctx.fillStyle = color;
    const clamped = Math.max(0, Math.min(1, ratio));
    if (clamped > 0.001) {
      ctx.beginPath();
      ctx.roundRect(x, y, width * clamped, height, height / 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 3, Math.max(0, width * clamped - 8), height * 0.28, height / 2);
    ctx.fill();
    ctx.restore();
  }

  private drawCrowdFormation(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    count: number,
    scale: number,
    time: number,
    color: string,
    deep: string,
    pop: number,
    alpha: number,
    celebrating: boolean,
    turbo: boolean,
    hat: string = 'none',
    trail: string = 'none',
  ): void {
    const visual = Math.max(
      1,
      Math.min(110, count <= 24 ? Math.ceil(count) : 12 + Math.ceil(Math.sqrt(count) * 4)),
    );
    const radius = Math.min(124, 22 + Math.sqrt(count) * 8.5) * scale;
    const charSize = Math.max(11, 58 * scale * (count > 900 ? 0.9 : 1));
    const golden = 2.399963;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Soft blob shadow under the whole crowd.
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + radius * 0.62, radius * 0.95, radius * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    if (turbo) {
      ctx.fillStyle = 'rgba(255, 216, 71, 0.22)';
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + radius * 0.2, radius * 1.1, radius * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (trail !== 'none') {
      this.drawTrail(ctx, centerX, centerY, radius, scale, time, trail);
    }

    if (celebrating) {
      const glow = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        radius * 1.8,
      );
      glow.addColorStop(0, 'rgba(255, 233, 138, 0.35)');
      glow.addColorStop(1, 'rgba(255, 233, 138, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Running dust puffs behind the crowd.
    for (let i = 0; i < 4; i++) {
      const phase = time * 3.4 + i * 1.9;
      const dustX = centerX + Math.sin(phase) * radius * 0.55;
      const dustY = centerY + radius * 0.62 + (i % 2) * 6 * scale;
      ctx.globalAlpha = alpha * (0.1 + 0.08 * (0.5 + 0.5 * Math.sin(phase * 2)));
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(dustX, dustY, (6 + i * 2) * scale, 3 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = alpha;

    const members: Array<{ x: number; y: number; i: number }> = [];
    for (let i = 0; i < visual; i++) {
      const angle = i * golden + 0.4;
      const r = radius * Math.sqrt((i + 0.4) / visual);
      const offsetX = Math.cos(angle) * r;
      const offsetY = Math.sin(angle) * r * 0.62;
      members.push({ x: centerX + offsetX, y: centerY + offsetY, i });
    }
    members.sort((a, b) => a.y - b.y);

    for (const member of members) {
      const bobSpeed = celebrating ? 11 : 6;
      const bob = Math.sin(time * bobSpeed + member.i * 1.7) * (celebrating ? 6 : 2.4) * scale;
      const squashY = 1 + pop * 0.18 + Math.sin(time * 5 + member.i) * 0.02;
      const squashX = 1 - pop * 0.1;
      this.drawCharacter(
        ctx,
        member.x,
        member.y + bob,
        charSize,
        color,
        deep,
        squashX,
        squashY,
        member.i,
        hat,
        false,
        time,
      );
    }

    this.drawCountBubble(
      ctx,
      centerX,
      centerY - radius - 34 * scale,
      count,
      pop,
      color,
      celebrating,
    );

    ctx.globalAlpha = alpha;
    ctx.restore();
  }

  private drawCountBubble(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    count: number,
    pop: number,
    color: string,
    celebrating: boolean,
  ): void {
    const label = count >= 1_000_000
      ? `${(count / 1_000_000).toFixed(1)}m`
      : count >= 1000
        ? `${(count / 1000).toFixed(count < 10_000 ? 1 : 0)}k`
        : `${count}`;
    const size = 15;
    const scale = 1 + pop * 0.18 + (celebrating ? Math.abs(Math.sin(performance.now() / 180)) * 0.06 : 0);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.font = `800 ${size}px 'Baloo 2', system-ui, sans-serif`;
    const width = ctx.measureText(label).width + 22;
    const height = 25;
    ctx.fillStyle = 'rgba(8, 14, 28, 0.68)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-width / 2, -height / 2, width, height, height / 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 1);
    ctx.restore();
  }

  private drawTrail(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    scale: number,
    time: number,
    trail: string,
  ): void {
    ctx.save();
    const palettes: Record<string, string[]> = {
      sparkle: ['#ffe98a', '#ffffff', '#ffd447'],
      bubbles: ['#8be9ff', '#c9f7ff', '#5bc8e8'],
      flame: ['#ff9c4f', '#ff6b35', '#ffd447'],
      rainbow: ['#ff5f5f', '#ffb45f', '#ffe45f', '#7dff8a', '#5fd8ff', '#a78bfa'],
    };
    const colors = palettes[trail] ?? ['#ffffff'];
    for (let i = 0; i < 8; i++) {
      const phase = time * 4 + i * 0.8;
      const x = centerX + Math.sin(phase) * radius * 0.45;
      const y = centerY + radius * 0.5 + i * 7 * scale;
      const alpha = 0.38 * (1 - i / 9);
      const size = (2 + (i % 3)) * scale * (trail === 'bubbles' ? 1.6 : 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1, size), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private drawCharacter(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color: string,
    deep: string,
    scaleX: number,
    scaleY: number,
    seed: number,
    hat: string,
    boss: boolean,
    time: number,
  ): void {
    const w = size * 0.78;
    const h = size;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scaleX, scaleY);

    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.beginPath();
    ctx.ellipse(0, h * 0.5, w * 0.48, h * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Feet.
    ctx.fillStyle = deep;
    const step = Math.sin(time * 7 + seed * 2.1) * w * 0.1;
    ctx.beginPath();
    ctx.ellipse(-w * 0.22 + step, h * 0.46, w * 0.17, h * 0.08, 0, 0, Math.PI * 2);
    ctx.ellipse(w * 0.22 - step, h * 0.46, w * 0.17, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body.
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly highlight.
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.ellipse(-w * 0.1, -h * 0.08, w * 0.26, h * 0.28, -0.3, 0, Math.PI * 2);
    ctx.fill();

    if (hat !== 'none') {
      this.drawHat(ctx, hat, w, h);
    }

    // Face.
    const eyeY = -h * 0.12;
    const eyeX = w * 0.18;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-eyeX, eyeY, w * 0.13, h * 0.15, 0, 0, Math.PI * 2);
    ctx.ellipse(eyeX, eyeY, w * 0.13, h * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1b2233';
    const blink = Math.sin(time * 1.8 + seed) > 0.985 ? 0.25 : 1;
    ctx.beginPath();
    ctx.ellipse(-eyeX + w * 0.01, eyeY, w * 0.065, h * 0.085 * blink, 0, 0, Math.PI * 2);
    ctx.ellipse(eyeX + w * 0.01, eyeY, w * 0.065, h * 0.085 * blink, 0, 0, Math.PI * 2);
    ctx.fill();

    // Smile.
    ctx.strokeStyle = '#1b2233';
    ctx.lineWidth = Math.max(1, size * 0.035);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, h * 0.04, w * 0.16, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Cheeks.
    ctx.fillStyle = 'rgba(255, 120, 120, 0.35)';
    ctx.beginPath();
    ctx.ellipse(-w * 0.3, h * 0.05, w * 0.09, h * 0.06, 0, 0, Math.PI * 2);
    ctx.ellipse(w * 0.3, h * 0.05, w * 0.09, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();

    if (boss) {
      ctx.fillStyle = '#ffd447';
      ctx.fillRect(-w * 0.3, -h * 0.62, w * 0.6, h * 0.12);
    }

    ctx.restore();
  }

  private drawHat(
    ctx: CanvasRenderingContext2D,
    hat: string,
    w: number,
    h: number,
  ): void {
    switch (hat) {
      case 'cap': {
        ctx.fillStyle = '#3dd6f5';
        ctx.beginPath();
        ctx.ellipse(0, -h * 0.46, w * 0.34, h * 0.18, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-w * 0.34, -h * 0.46, w * 0.72, h * 0.07);
        break;
      }
      case 'halo': {
        ctx.strokeStyle = '#ffe98a';
        ctx.lineWidth = Math.max(2, h * 0.06);
        ctx.shadowColor = '#ffd447';
        ctx.shadowBlur = h * 0.2;
        ctx.beginPath();
        ctx.ellipse(0, -h * 0.66, w * 0.3, h * 0.06, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        break;
      }
      case 'horns': {
        ctx.fillStyle = '#ff7a6b';
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(side * w * 0.2, -h * 0.42);
          ctx.lineTo(side * w * 0.42, -h * 0.86);
          ctx.lineTo(side * w * 0.42, -h * 0.38);
          ctx.closePath();
          ctx.fill();
        }
        break;
      }
      case 'crown': {
        ctx.fillStyle = '#ffd447';
        ctx.strokeStyle = '#a87400';
        ctx.lineWidth = Math.max(1, h * 0.025);
        ctx.beginPath();
        ctx.moveTo(-w * 0.38, -h * 0.45);
        ctx.lineTo(-w * 0.38, -h * 0.72);
        ctx.lineTo(-w * 0.2, -h * 0.56);
        ctx.lineTo(0, -h * 0.82);
        ctx.lineTo(w * 0.2, -h * 0.56);
        ctx.lineTo(w * 0.38, -h * 0.72);
        ctx.lineTo(w * 0.38, -h * 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'antenna': {
        ctx.strokeStyle = '#8cf03a';
        ctx.lineWidth = Math.max(1.5, h * 0.04);
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.48);
        ctx.lineTo(0, -h * 0.8);
        ctx.stroke();
        ctx.fillStyle = '#c9ff8f';
        ctx.beginPath();
        ctx.arc(0, -h * 0.86, h * 0.09, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
  }

  // --------------------------------------------------------------- effects

  private drawParticles(
    ctx: CanvasRenderingContext2D,
    view: GameView,
    scale: number,
    toY: (worldY: number) => number,
  ): void {
    for (const particle of view.particles) {
      this.drawParticle(ctx, particle, view, scale, toY);
    }
  }

  private drawParticle(
    ctx: CanvasRenderingContext2D,
    particle: ParticleView,
    view: GameView,
    scale: number,
    toY: (worldY: number) => number,
  ): void {
    const y = toY(particle.y);
    const x = particle.x * scale;
    if (y < -60 || y > ctx.canvas.height + 60) return;
    const alpha = Math.max(0, Math.min(1, particle.life / 0.5));
    const size = particle.size * scale;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(particle.rotation);
    ctx.fillStyle = particle.color;

    if (particle.shape === 'confetti') {
      ctx.fillRect(-size / 2, -size / 4, size, size / 2);
    } else if (particle.shape === 'spark') {
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.4, 0);
      ctx.lineTo(0, size);
      ctx.lineTo(-size * 0.4, 0);
      ctx.closePath();
      ctx.fill();
    } else if (particle.shape === 'ring') {
      ctx.globalAlpha = alpha * 0.7;
      ctx.strokeStyle = particle.color;
      ctx.lineWidth = Math.max(1.5, 4 * scale);
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(2, size), 0, Math.PI * 2);
      ctx.stroke();
    } else if (particle.shape === 'star') {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const radius = i % 2 === 0 ? size : size * 0.45;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    } else if (particle.shape === 'coin') {
      ctx.fillStyle = '#ffd447';
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b48000';
      ctx.lineWidth = Math.max(1, size * 0.18);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    void view;
  }

  private drawPopups(
    ctx: CanvasRenderingContext2D,
    view: GameView,
    scale: number,
    toY: (worldY: number) => number,
  ): void {
    for (const popup of view.popups) {
      const y = toY(popup.y);
      const x = popup.x * scale;
      const alpha = Math.max(0, popup.life / popup.maxLife);
      const progress = 1 - alpha;
      const size = Math.max(16, popup.size * scale * (1 + progress * 0.25));

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `800 ${size}px 'Baloo 2', system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = Math.max(2, size * 0.16);
      ctx.strokeStyle = 'rgba(12,18,32,0.85)';
      ctx.strokeText(popup.text, x, y);
      ctx.fillStyle = popup.color;
      ctx.fillText(popup.text, x, y);
      ctx.restore();
    }
  }

  private drawVignette(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const gradient = ctx.createRadialGradient(
      width / 2,
      height * 0.48,
      Math.min(width, height) * 0.35,
      width / 2,
      height * 0.48,
      Math.max(width, height) * 0.75,
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(6,10,20,0.32)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  private drawSpeedLines(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    view: GameView,
  ): void {
    if (view.turboTime <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) {
      const seed = i * 17.3;
      const x = hash(seed) * width;
      const speed = 1.4 + hash(seed + 3) * 1.6;
      const length = (60 + hash(seed + 7) * 140) * (height / 900);
      const y = ((view.time * 900 * speed + hash(seed + 11) * height) % (height + length)) - length;
      ctx.globalAlpha = 0.18 + hash(seed + 13) * 0.22;
      ctx.strokeStyle = i % 3 === 0 ? '#ffffff' : view.theme.glow;
      ctx.lineWidth = 1 + hash(seed + 17) * 2.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + length);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawMagnetTrails(
    ctx: CanvasRenderingContext2D,
    view: GameView,
    scale: number,
    toY: (worldY: number) => number,
  ): void {
    if (view.magnetTime <= 0) return;
    const targetX = view.crowdX * scale;
    const targetY = toY(view.distance + 26);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const coin of view.coins) {
      if (coin.taken || !coin.magnetized) continue;
      const y = toY(coin.y);
      const x = coin.x * scale;
      ctx.globalAlpha = 0.2 + Math.abs(Math.sin(view.time * 6 + coin.id)) * 0.25;
      ctx.strokeStyle = '#ffe98a';
      ctx.lineWidth = Math.max(1, 2.5 * scale);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawCombo(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    view: GameView,
  ): void {
    if (view.combo < 3 || view.comboTimer <= 0) return;
    if (view.phase === 'won' || view.phase === 'lost') return;
    const alpha = Math.min(1, view.comboTimer / 0.5);
    const pulse = 1 + Math.sin(view.time * 14) * 0.05 + Math.min(0.25, view.comboTimer * 0.05);
    const size = Math.min(46, 24 + view.combo * 1.6) * pulse;
    const palette = ['#8cf03a', '#5fd8ff', '#ffd447', '#ff8ad8', '#b07bff'];
    const color = palette[Math.min(palette.length - 1, Math.floor(view.combo / 3) - 1)] ?? '#ffd447';
    const y = height * (view.battle ? 0.42 : 0.3);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(width / 2, y);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.max(10, size * 0.42)}px 'Baloo 2', system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText('COMBO', 0, -size * 0.6);
    ctx.font = `800 ${size}px 'Baloo 2', system-ui, sans-serif`;
    ctx.lineWidth = Math.max(3, size * 0.14);
    ctx.strokeStyle = 'rgba(8,14,26,0.75)';
    ctx.strokeText(`x${view.combo}`, 0, size * 0.15);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = size * 0.6;
    ctx.fillText(`x${view.combo}`, 0, size * 0.15);
    ctx.restore();
  }

  private drawFlash(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    view: GameView,
  ): void {
    if (view.flashAlpha <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = Math.min(0.5, view.flashAlpha);
    ctx.fillStyle = view.flashColor;
    ctx.fillRect(0, 0, width, height);
    const gradient = ctx.createRadialGradient(
      width / 2,
      height * 0.62,
      0,
      width / 2,
      height * 0.62,
      Math.max(width, height) * 0.8,
    );
    gradient.addColorStop(0, 'rgba(255,255,255,0.35)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = Math.min(0.4, view.flashAlpha * 0.8);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}
