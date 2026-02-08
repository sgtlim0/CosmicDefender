// ── Canvas ──
export const CANVAS_WIDTH = 400
export const CANVAS_HEIGHT = 600

// ── Player ──
export const PLAYER_WIDTH = 36
export const PLAYER_HEIGHT = 40
export const PLAYER_SPEED = 4.5

// ── Bullet ──
export const BULLET_WIDTH = 4
export const BULLET_HEIGHT = 14
export const BULLET_SPEED = 7
export const SHOOT_COOLDOWN = 200 // ms

// ── Enemy ──
export const ENEMY_WIDTH = 32
export const ENEMY_HEIGHT = 32
export const ENEMY_BASE_SPEED = 1.2
export const ENEMY_SPEED_PER_WAVE = 0.25

// ── Game ──
export const BASE_ENEMIES_PER_WAVE = 4
export const ENEMIES_PER_WAVE_INC = 2
export const WAVE_SPAWN_DELAY = 400
export const WAVE_REST_DELAY = 2000
export const POWERUP_DROP_CHANCE = 0.12
export const POWERUP_SPEED = 2
export const POWERUP_SIZE = 18
export const HEALTH_RESTORE = 20
export const COLLISION_DAMAGE = 15
export const SCORE_PER_KILL = 100

export type Phase = 'title' | 'playing' | 'gameover'

export interface Position {
  readonly x: number
  readonly y: number
}

export interface Bullet {
  readonly x: number
  readonly y: number
}

export type EnemyKind = 'normal' | 'fast' | 'tank'

export interface Enemy {
  readonly x: number
  readonly y: number
  readonly kind: EnemyKind
  readonly hp: number
  readonly phase: number
}

export interface Particle {
  readonly x: number
  readonly y: number
  readonly vx: number
  readonly vy: number
  readonly life: number
  readonly maxLife: number
  readonly color: string
  readonly size: number
}

export interface Powerup {
  readonly x: number
  readonly y: number
  readonly kind: 'health' | 'rapid' | 'shield'
}

export interface ScorePopup {
  readonly x: number
  readonly y: number
  readonly value: number
  readonly life: number
}

export interface GameState {
  readonly phase: Phase
  readonly playerX: number
  readonly playerY: number
  readonly bullets: readonly Bullet[]
  readonly enemies: readonly Enemy[]
  readonly particles: readonly Particle[]
  readonly powerups: readonly Powerup[]
  readonly scorePopups: readonly ScorePopup[]
  readonly score: number
  readonly bestScore: number
  readonly wave: number
  readonly health: number
  readonly maxHealth: number
  readonly shake: number
  readonly waveText: string
  readonly waveTextLife: number
  readonly rapidFireUntil: number
  readonly shieldUntil: number
  readonly lastShot: number
  readonly spawnQueue: number
  readonly spawnTimer: number
  readonly waveRestTimer: number
  readonly autoFire: boolean
}
