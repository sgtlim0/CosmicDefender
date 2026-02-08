import type { GameState, Bullet, Enemy, Particle, Powerup } from './types.ts'
import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  PLAYER_WIDTH, PLAYER_HEIGHT,
  BULLET_WIDTH, BULLET_HEIGHT,
  ENEMY_WIDTH, ENEMY_HEIGHT,
  POWERUP_SIZE,
} from './types.ts'

// ── Stars background (static) ──
const stars: { x: number; y: number; size: number; speed: number }[] = []
for (let i = 0; i < 80; i++) {
  stars.push({
    x: Math.random() * CANVAS_WIDTH,
    y: Math.random() * CANVAS_HEIGHT,
    size: Math.random() * 2 + 0.5,
    speed: 0.2 + Math.random() * 0.6,
  })
}

function drawStars(ctx: CanvasRenderingContext2D, frame: number) {
  for (const s of stars) {
    const y = (s.y + frame * s.speed) % CANVAS_HEIGHT
    const alpha = 0.3 + Math.sin(frame * 0.02 + s.x) * 0.3
    ctx.fillStyle = `rgba(255,255,255,${alpha})`
    ctx.beginPath()
    ctx.arc(s.x, y, s.size, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, frame: number) {
  // Deep space gradient
  const grad = ctx.createRadialGradient(
    CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 0,
    CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH,
  )
  grad.addColorStop(0, '#1a0033')
  grad.addColorStop(1, '#0a0015')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  drawStars(ctx, frame)

  // Border glow
  ctx.strokeStyle = 'rgba(0,255,255,0.3)'
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, CANVAS_WIDTH - 2, CANVAS_HEIGHT - 2)
}

function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number, shielded: boolean) {
  const cx = x + PLAYER_WIDTH / 2
  const cy = y + PLAYER_HEIGHT / 2

  // Engine glow
  const flicker = Math.sin(frame * 0.3) * 3
  ctx.shadowColor = '#ff6600'
  ctx.shadowBlur = 12
  ctx.fillStyle = '#ff8800'
  ctx.beginPath()
  ctx.moveTo(cx - 6, y + PLAYER_HEIGHT)
  ctx.lineTo(cx, y + PLAYER_HEIGHT + 10 + flicker)
  ctx.lineTo(cx + 6, y + PLAYER_HEIGHT)
  ctx.closePath()
  ctx.fill()

  // Ship body
  ctx.shadowColor = '#00d4ff'
  ctx.shadowBlur = 20
  ctx.fillStyle = '#00d4ff'
  ctx.beginPath()
  ctx.moveTo(cx, y)
  ctx.lineTo(x, y + PLAYER_HEIGHT)
  ctx.lineTo(cx, y + PLAYER_HEIGHT - 10)
  ctx.lineTo(x + PLAYER_WIDTH, y + PLAYER_HEIGHT)
  ctx.closePath()
  ctx.fill()

  // Wing accents
  ctx.fillStyle = '#0088cc'
  ctx.beginPath()
  ctx.moveTo(cx, y + 8)
  ctx.lineTo(x + 4, y + PLAYER_HEIGHT - 4)
  ctx.lineTo(cx, y + PLAYER_HEIGHT - 12)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(cx, y + 8)
  ctx.lineTo(x + PLAYER_WIDTH - 4, y + PLAYER_HEIGHT - 4)
  ctx.lineTo(cx, y + PLAYER_HEIGHT - 12)
  ctx.closePath()
  ctx.fill()

  // Cockpit
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = '#ffffff'
  ctx.shadowBlur = 8
  ctx.beginPath()
  ctx.arc(cx, cy - 2, 5, 0, Math.PI * 2)
  ctx.fill()

  // Shield effect
  if (shielded) {
    ctx.strokeStyle = `rgba(0,255,200,${0.4 + Math.sin(frame * 0.15) * 0.3})`
    ctx.lineWidth = 2
    ctx.shadowColor = '#00ffc8'
    ctx.shadowBlur = 15
    ctx.beginPath()
    ctx.arc(cx, cy, 26, 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.shadowBlur = 0
}

function drawBullets(ctx: CanvasRenderingContext2D, bullets: readonly Bullet[]) {
  ctx.shadowColor = '#00ffff'
  ctx.shadowBlur = 12
  for (const b of bullets) {
    ctx.fillStyle = '#00ffff'
    ctx.fillRect(b.x - BULLET_WIDTH / 2, b.y, BULLET_WIDTH, BULLET_HEIGHT)
    // Trail
    ctx.fillStyle = 'rgba(0,255,255,0.3)'
    ctx.fillRect(b.x - BULLET_WIDTH / 2, b.y + BULLET_HEIGHT, BULLET_WIDTH, 8)
  }
  ctx.shadowBlur = 0
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, frame: number) {
  const cx = e.x + ENEMY_WIDTH / 2
  const cy = e.y + ENEMY_HEIGHT / 2

  const colors: Record<string, { body: string; glow: string }> = {
    normal: { body: '#ff0080', glow: '#ff0080' },
    fast: { body: '#ff00ff', glow: '#ff00ff' },
    tank: { body: '#ff4400', glow: '#ff6600' },
  }
  const color = colors[e.kind] || colors.normal

  ctx.shadowColor = color.glow
  ctx.shadowBlur = 15

  // Enemy body (inverted triangle)
  ctx.fillStyle = color.body
  ctx.beginPath()
  ctx.moveTo(cx, e.y + ENEMY_HEIGHT)
  ctx.lineTo(e.x, e.y)
  ctx.lineTo(cx, e.y + 8)
  ctx.lineTo(e.x + ENEMY_WIDTH, e.y)
  ctx.closePath()
  ctx.fill()

  // Eyes
  ctx.fillStyle = '#ffff00'
  ctx.shadowColor = '#ffff00'
  ctx.shadowBlur = 6
  ctx.beginPath()
  ctx.arc(cx - 7, cy - 2, 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx + 7, cy - 2, 3, 0, Math.PI * 2)
  ctx.fill()

  // Tank HP indicator
  if (e.kind === 'tank' && e.hp > 1) {
    ctx.fillStyle = 'rgba(255,68,0,0.7)'
    ctx.shadowBlur = 0
    const barW = ENEMY_WIDTH * 0.8
    ctx.fillRect(cx - barW / 2, e.y - 6, barW * (e.hp / 3), 3)
  }

  ctx.shadowBlur = 0
  void frame // used for potential animation
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: readonly Particle[]) {
  for (const p of particles) {
    ctx.globalAlpha = p.life / p.maxLife
    ctx.fillStyle = p.color
    ctx.shadowColor = p.color
    ctx.shadowBlur = 4
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
}

function drawPowerups(ctx: CanvasRenderingContext2D, powerups: readonly Powerup[], frame: number) {
  for (const p of powerups) {
    const cx = p.x + POWERUP_SIZE / 2
    const cy = p.y + POWERUP_SIZE / 2
    const bob = Math.sin(frame * 0.1) * 3

    const pColors: Record<string, { bg: string; glow: string; icon: string }> = {
      health: { bg: '#00ff66', glow: '#00ff66', icon: '+' },
      rapid: { bg: '#ffaa00', glow: '#ffaa00', icon: '\u26A1' },
      shield: { bg: '#00ffc8', glow: '#00ffc8', icon: '\u25CB' },
    }
    const color = pColors[p.kind] || pColors.health

    ctx.shadowColor = color.glow
    ctx.shadowBlur = 12
    ctx.fillStyle = color.bg
    ctx.beginPath()
    ctx.arc(cx, cy + bob, POWERUP_SIZE / 2, 0, Math.PI * 2)
    ctx.fill()

    ctx.shadowBlur = 0
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(color.icon, cx, cy + bob + 1)
  }
}

function drawHealthBar(ctx: CanvasRenderingContext2D, health: number, maxHealth: number) {
  const barW = 160
  const barH = 10
  const x = CANVAS_WIDTH / 2 - barW / 2
  const y = CANVAS_HEIGHT - 20

  // Background
  ctx.fillStyle = 'rgba(255,0,128,0.2)'
  ctx.strokeStyle = 'rgba(255,0,128,0.6)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(x, y, barW, barH, 5)
  ctx.fill()
  ctx.stroke()

  // Fill
  const pct = Math.max(0, health / maxHealth)
  if (pct > 0) {
    const fillColor = pct > 0.5 ? '#00ff66' : pct > 0.25 ? '#ffaa00' : '#ff0044'
    ctx.shadowColor = fillColor
    ctx.shadowBlur = 8
    ctx.fillStyle = fillColor
    ctx.beginPath()
    ctx.roundRect(x + 1, y + 1, (barW - 2) * pct, barH - 2, 4)
    ctx.fill()
    ctx.shadowBlur = 0
  }
}

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.font = 'bold 11px "Segoe UI", sans-serif'
  ctx.textAlign = 'left'

  // Score
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.beginPath()
  ctx.roundRect(8, 8, 90, 32, 6)
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,255,255,0.4)'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.fillStyle = 'rgba(0,255,255,0.7)'
  ctx.fillText('SCORE', 14, 22)
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 13px "Segoe UI", sans-serif'
  ctx.fillText(`${state.score}`, 14, 36)

  // Wave
  ctx.font = 'bold 11px "Segoe UI", sans-serif'
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.beginPath()
  ctx.roundRect(106, 8, 70, 32, 6)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,0,128,0.4)'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,0,128,0.7)'
  ctx.fillText('WAVE', 112, 22)
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 13px "Segoe UI", sans-serif'
  ctx.fillText(`${state.wave}`, 112, 36)

  // Best
  if (state.bestScore > 0) {
    ctx.font = 'bold 11px "Segoe UI", sans-serif'
    ctx.textAlign = 'right'
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.beginPath()
    ctx.roundRect(CANVAS_WIDTH - 98, 8, 90, 32, 6)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,215,0,0.4)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,215,0,0.7)'
    ctx.fillText('BEST', CANVAS_WIDTH - 14, 22)
    ctx.fillStyle = '#ffd700'
    ctx.font = 'bold 13px "Segoe UI", sans-serif'
    ctx.fillText(`${state.bestScore}`, CANVAS_WIDTH - 14, 36)
  }

  // Health bar
  drawHealthBar(ctx, state.health, state.maxHealth)
}

function drawWaveText(ctx: CanvasRenderingContext2D, text: string, life: number) {
  if (life <= 0) return
  const alpha = Math.min(1, life / 30)
  const scale = 1 + (1 - alpha) * 0.3
  ctx.save()
  ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
  ctx.scale(scale, scale)
  ctx.globalAlpha = alpha
  ctx.font = 'bold 28px "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#00ffff'
  ctx.shadowColor = '#00ffff'
  ctx.shadowBlur = 20
  ctx.fillText(text, 0, 0)
  ctx.shadowBlur = 0
  ctx.globalAlpha = 1
  ctx.restore()
}

export function render(ctx: CanvasRenderingContext2D, state: GameState, frame: number) {
  ctx.save()

  // Screen shake
  if (state.shake > 0) {
    const intensity = state.shake * 5
    ctx.translate(
      (Math.random() - 0.5) * intensity,
      (Math.random() - 0.5) * intensity,
    )
  }

  drawBackground(ctx, frame)

  if (state.phase === 'playing' || state.phase === 'gameover') {
    drawPowerups(ctx, state.powerups, frame)
    drawBullets(ctx, state.bullets)
    state.enemies.forEach(e => drawEnemy(ctx, e, frame))
    drawParticles(ctx, state.particles)
    drawPlayer(ctx, state.playerX, state.playerY, frame, state.shieldUntil > 0)
    drawHUD(ctx, state)
    drawWaveText(ctx, state.waveText, state.waveTextLife)
  }

  ctx.restore()
}
