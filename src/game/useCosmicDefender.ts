import { useRef, useCallback, useEffect } from 'react'
import type { GameState, Bullet, Enemy, Particle, Powerup, EnemyKind, Phase } from './types.ts'
import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_SPEED,
  BULLET_WIDTH, BULLET_HEIGHT, BULLET_SPEED, SHOOT_COOLDOWN,
  ENEMY_WIDTH, ENEMY_HEIGHT, ENEMY_BASE_SPEED, ENEMY_SPEED_PER_WAVE,
  BASE_ENEMIES_PER_WAVE, ENEMIES_PER_WAVE_INC,
  WAVE_SPAWN_DELAY, WAVE_REST_DELAY,
  POWERUP_DROP_CHANCE, POWERUP_SPEED, POWERUP_SIZE,
  HEALTH_RESTORE, COLLISION_DAMAGE, SCORE_PER_KILL,
} from './types.ts'
import {
  playShoot, playEnemyHit, playEnemyDie,
  playPlayerHit, playPowerup, playWave, playGameOver,
} from './sound.ts'

const BEST_SCORE_KEY = 'cosmic-defender-best'

function loadBestScore(): number {
  try { return Number(localStorage.getItem(BEST_SCORE_KEY)) || 0 }
  catch { return 0 }
}

function saveBestScore(score: number) {
  try { localStorage.setItem(BEST_SCORE_KEY, String(score)) }
  catch { /* ignore */ }
}

function createInitialState(): GameState {
  return {
    phase: 'title',
    playerX: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
    playerY: CANVAS_HEIGHT - 80,
    bullets: [],
    enemies: [],
    particles: [],
    powerups: [],
    scorePopups: [],
    score: 0,
    bestScore: loadBestScore(),
    wave: 0,
    health: 100,
    maxHealth: 100,
    shake: 0,
    waveText: '',
    waveTextLife: 0,
    rapidFireUntil: 0,
    shieldUntil: 0,
    lastShot: 0,
    spawnQueue: 0,
    spawnTimer: 0,
    waveRestTimer: 0,
    autoFire: 'ontouchstart' in window,
  }
}

function rectCollision(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

function createExplosion(x: number, y: number, color: string, count = 15): Particle[] {
  return Array.from({ length: count }, () => ({
    x,
    y,
    vx: (Math.random() - 0.5) * 8,
    vy: (Math.random() - 0.5) * 8,
    life: 1,
    maxLife: 1,
    color,
    size: 1.5 + Math.random() * 4,
  }))
}

function randomEnemyKind(wave: number): EnemyKind {
  const r = Math.random()
  if (wave >= 5 && r < 0.15) return 'tank'
  if (wave >= 2 && r < 0.35) return 'fast'
  return 'normal'
}

function enemyHp(kind: EnemyKind, wave: number): number {
  const base = kind === 'tank' ? 3 : kind === 'fast' ? 1 : 1
  return base + Math.floor(wave / 4)
}

function randomPowerupKind(): Powerup['kind'] {
  const r = Math.random()
  if (r < 0.5) return 'health'
  if (r < 0.8) return 'rapid'
  return 'shield'
}

export interface InputState {
  keys: Record<string, boolean>
  shooting: boolean
  joystickX: number
  joystickY: number
  joystickActive: boolean
}

export interface CosmicDefenderAPI {
  readonly state: React.RefObject<GameState>
  readonly frame: React.RefObject<number>
  readonly inputRef: React.RefObject<InputState>
  readonly startGame: () => void
  readonly restartGame: () => void
}

export function useCosmicDefender(
  onStateChange?: (state: { phase: Phase; score: number; bestScore: number; wave: number; health: number }) => void,
): CosmicDefenderAPI {
  const stateRef = useRef<GameState>(createInitialState())
  const frameRef = useRef(0)
  const animRef = useRef(0)
  const lastTickRef = useRef(0)
  const inputRef = useRef<InputState>({
    keys: {},
    shooting: false,
    joystickX: 0,
    joystickY: 0,
    joystickActive: false,
  })

  const notifyUI = useCallback(() => {
    const s = stateRef.current
    onStateChange?.({
      phase: s.phase,
      score: s.score,
      bestScore: s.bestScore,
      wave: s.wave,
      health: s.health,
    })
  }, [onStateChange])

  const tick = useCallback((now: number) => {
    const s = stateRef.current
    if (s.phase !== 'playing') return

    const dt = Math.min(now - lastTickRef.current, 32)
    lastTickRef.current = now

    const input = inputRef.current
    let { playerX, playerY } = s

    // ── Player movement (keyboard) ──
    let moveX = 0
    let moveY = 0
    if (input.keys['ArrowLeft'] || input.keys['a'] || input.keys['A']) moveX -= 1
    if (input.keys['ArrowRight'] || input.keys['d'] || input.keys['D']) moveX += 1
    if (input.keys['ArrowUp'] || input.keys['w'] || input.keys['W']) moveY -= 1
    if (input.keys['ArrowDown'] || input.keys['s'] || input.keys['S']) moveY += 1

    // ── Joystick input ──
    if (input.joystickActive) {
      moveX += input.joystickX
      moveY += input.joystickY
    }

    // Normalize diagonal movement
    const mag = Math.sqrt(moveX * moveX + moveY * moveY)
    if (mag > 1) {
      moveX /= mag
      moveY /= mag
    }

    playerX += moveX * PLAYER_SPEED
    playerY += moveY * PLAYER_SPEED
    playerX = Math.max(0, Math.min(CANVAS_WIDTH - PLAYER_WIDTH, playerX))
    playerY = Math.max(0, Math.min(CANVAS_HEIGHT - PLAYER_HEIGHT, playerY))

    // ── Shooting (auto-fire on mobile, space on desktop) ──
    let newBullets = [...s.bullets]
    let lastShot = s.lastShot
    const cooldown = s.rapidFireUntil > now ? SHOOT_COOLDOWN / 3 : SHOOT_COOLDOWN
    const shouldShoot = input.keys[' '] || input.shooting || s.autoFire
    if (shouldShoot && now - lastShot > cooldown) {
      newBullets.push({ x: playerX + PLAYER_WIDTH / 2, y: playerY - 4 })
      if (s.rapidFireUntil > now) {
        newBullets.push({ x: playerX + 6, y: playerY + 4 })
        newBullets.push({ x: playerX + PLAYER_WIDTH - 6, y: playerY + 4 })
      }
      lastShot = now
      playShoot()
    }

    // ── Update bullets ──
    newBullets = newBullets
      .map(b => ({ ...b, y: b.y - BULLET_SPEED }))
      .filter(b => b.y > -BULLET_HEIGHT)

    // ── Spawn enemies ──
    let { spawnQueue, spawnTimer, waveRestTimer, wave, waveText, waveTextLife } = s
    if (spawnQueue > 0 && now - spawnTimer > WAVE_SPAWN_DELAY) {
      const kind = randomEnemyKind(wave)
      const newEnemy: Enemy = {
        x: Math.random() * (CANVAS_WIDTH - ENEMY_WIDTH),
        y: -ENEMY_HEIGHT - Math.random() * 60,
        kind,
        hp: enemyHp(kind, wave),
        phase: Math.random() * Math.PI * 2,
      }
      spawnQueue--
      spawnTimer = now
      stateRef.current = { ...stateRef.current, enemies: [...stateRef.current.enemies, newEnemy] }
    }

    // ── Update enemies ──
    const enemySpeed = ENEMY_BASE_SPEED + wave * ENEMY_SPEED_PER_WAVE
    let newEnemies = [...stateRef.current.enemies].map(e => {
      const speed = e.kind === 'fast' ? enemySpeed * 1.6 : e.kind === 'tank' ? enemySpeed * 0.6 : enemySpeed
      let newX = e.x
      if (e.kind === 'fast') {
        newX = e.x + Math.sin(e.y * 0.04 + e.phase) * 2.5
      }
      return { ...e, x: newX, y: e.y + speed }
    })

    // ── Bullet-enemy collisions ──
    let newScore = s.score
    let newParticles = [...s.particles]
    let newPowerups = [...s.powerups]
    let newScorePopups = [...s.scorePopups]
    const survivingBullets: Bullet[] = []
    const hitEnemyIndices = new Set<number>()

    for (const bullet of newBullets) {
      let bulletHit = false
      for (let ei = 0; ei < newEnemies.length; ei++) {
        if (hitEnemyIndices.has(ei)) continue
        const e = newEnemies[ei]
        if (rectCollision(
          bullet.x - BULLET_WIDTH / 2, bullet.y, BULLET_WIDTH, BULLET_HEIGHT,
          e.x, e.y, ENEMY_WIDTH, ENEMY_HEIGHT,
        )) {
          bulletHit = true
          const newHp = e.hp - 1
          if (newHp <= 0) {
            hitEnemyIndices.add(ei)
            const pts = SCORE_PER_KILL * (e.kind === 'tank' ? 3 : e.kind === 'fast' ? 2 : 1)
            newScore += pts
            newParticles.push(...createExplosion(e.x + ENEMY_WIDTH / 2, e.y + ENEMY_HEIGHT / 2, '#ffff00', 20))
            newScorePopups.push({ x: e.x + ENEMY_WIDTH / 2, y: e.y, value: pts, life: 1 })
            playEnemyDie()
            if (Math.random() < POWERUP_DROP_CHANCE) {
              newPowerups.push({ x: e.x, y: e.y, kind: randomPowerupKind() })
            }
          } else {
            newEnemies[ei] = { ...e, hp: newHp }
            newParticles.push(...createExplosion(bullet.x, bullet.y, '#00ffff', 6))
            playEnemyHit()
          }
          break
        }
      }
      if (!bulletHit) survivingBullets.push(bullet)
    }

    newEnemies = newEnemies.filter((_, i) => !hitEnemyIndices.has(i))

    // ── Enemy-player collisions ──
    let health = s.health
    let shake = Math.max(s.shake - 0.03, 0)
    const shielded = s.shieldUntil > now
    const survivingEnemies: Enemy[] = []

    for (const e of newEnemies) {
      if (e.y > CANVAS_HEIGHT + 50) continue
      if (rectCollision(playerX, playerY, PLAYER_WIDTH, PLAYER_HEIGHT, e.x, e.y, ENEMY_WIDTH, ENEMY_HEIGHT)) {
        if (!shielded) {
          health -= COLLISION_DAMAGE
          shake = 1
          playPlayerHit()
        }
        newParticles.push(...createExplosion(e.x + ENEMY_WIDTH / 2, e.y + ENEMY_HEIGHT / 2, '#ff0080', 12))
        continue
      }
      survivingEnemies.push(e)
    }

    // ── Powerup collisions ──
    let rapidFireUntil = s.rapidFireUntil
    let shieldUntil = s.shieldUntil
    const survivingPowerups: Powerup[] = []
    for (const p of newPowerups) {
      const py = p.y + POWERUP_SPEED
      if (py > CANVAS_HEIGHT) continue
      if (rectCollision(playerX, playerY, PLAYER_WIDTH, PLAYER_HEIGHT, p.x, py, POWERUP_SIZE, POWERUP_SIZE)) {
        if (p.kind === 'health') health = Math.min(s.maxHealth, health + HEALTH_RESTORE)
        else if (p.kind === 'rapid') rapidFireUntil = now + 8000
        else if (p.kind === 'shield') shieldUntil = now + 6000
        playPowerup()
        newParticles.push(...createExplosion(p.x + POWERUP_SIZE / 2, py + POWERUP_SIZE / 2, '#00ff66', 8))
        continue
      }
      survivingPowerups.push({ ...p, y: py })
    }

    // ── Update particles ──
    newParticles = newParticles
      .map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vy: p.vy + 0.08,
        life: p.life - 0.025,
      }))
      .filter(p => p.life > 0)

    // ── Update score popups ──
    newScorePopups = newScorePopups
      .map(sp => ({ ...sp, y: sp.y - 1.2, life: sp.life - 0.02 }))
      .filter(sp => sp.life > 0)

    // ── Wave completion ──
    if (survivingEnemies.length === 0 && spawnQueue === 0 && waveRestTimer === 0) {
      waveRestTimer = now
    }
    if (waveRestTimer > 0 && now - waveRestTimer > WAVE_REST_DELAY && spawnQueue === 0 && survivingEnemies.length === 0) {
      wave++
      const count = BASE_ENEMIES_PER_WAVE + wave * ENEMIES_PER_WAVE_INC
      spawnQueue = count
      spawnTimer = now
      waveRestTimer = 0
      waveText = `WAVE ${wave}`
      waveTextLife = 90
      playWave()
    }

    if (waveTextLife > 0) waveTextLife--

    const newBest = Math.max(newScore, s.bestScore)

    let phase: Phase = 'playing'
    if (health <= 0) {
      health = 0
      phase = 'gameover'
      saveBestScore(newBest)
      playGameOver()
      newParticles.push(...createExplosion(playerX + PLAYER_WIDTH / 2, playerY + PLAYER_HEIGHT / 2, '#ff0080', 40))
    }

    stateRef.current = {
      ...s,
      phase,
      playerX,
      playerY,
      bullets: survivingBullets,
      enemies: survivingEnemies,
      particles: newParticles,
      powerups: survivingPowerups,
      scorePopups: newScorePopups,
      score: newScore,
      bestScore: newBest,
      wave,
      health,
      shake,
      waveText,
      waveTextLife,
      rapidFireUntil,
      shieldUntil,
      lastShot,
      spawnQueue,
      spawnTimer,
      waveRestTimer,
    }

    notifyUI()
    void dt
  }, [notifyUI])

  const loop = useCallback((timestamp: number) => {
    frameRef.current++
    tick(timestamp)

    const s = stateRef.current
    if (s.phase === 'gameover' && (s.particles.length > 0 || s.scorePopups.length > 0)) {
      stateRef.current = {
        ...s,
        particles: s.particles
          .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.08, life: p.life - 0.025 }))
          .filter(p => p.life > 0),
        scorePopups: s.scorePopups
          .map(sp => ({ ...sp, y: sp.y - 1.2, life: sp.life - 0.02 }))
          .filter(sp => sp.life > 0),
        shake: Math.max(s.shake - 0.02, 0),
      }
    }

    animRef.current = requestAnimationFrame(loop)
  }, [tick])

  const startGame = useCallback(() => {
    const now = performance.now()
    stateRef.current = {
      ...createInitialState(),
      phase: 'playing',
      bestScore: stateRef.current.bestScore,
      wave: 1,
      spawnQueue: BASE_ENEMIES_PER_WAVE + 1 * ENEMIES_PER_WAVE_INC,
      spawnTimer: now,
      waveText: 'WAVE 1',
      waveTextLife: 90,
    }
    lastTickRef.current = now
    playWave()
    notifyUI()
  }, [notifyUI])

  const restartGame = useCallback(() => {
    startGame()
  }, [startGame])

  useEffect(() => {
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [loop])

  return { state: stateRef, frame: frameRef, inputRef, startGame, restartGame }
}
