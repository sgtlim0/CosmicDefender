let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as unknown as Record<string, unknown>).webkitAudioContext)()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function playTone(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.06) {
  try {
    const c = getCtx()
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, c.currentTime)
    gain.gain.setValueAtTime(volume, c.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)
    osc.connect(gain)
    gain.connect(c.destination)
    osc.start(c.currentTime)
    osc.stop(c.currentTime + duration)
  } catch { /* ignore audio errors */ }
}

function vibrate(ms: number) {
  if (navigator.vibrate) navigator.vibrate(ms)
}

export function playShoot() {
  playTone(1200, 0.05, 'square', 0.04)
  setTimeout(() => playTone(1800, 0.03, 'square', 0.03), 20)
}

export function playEnemyHit() {
  playTone(400, 0.06, 'sawtooth', 0.05)
  vibrate(8)
}

export function playEnemyDie() {
  playTone(200, 0.1, 'square', 0.06)
  setTimeout(() => playTone(150, 0.15, 'sawtooth', 0.05), 50)
  vibrate(15)
}

export function playPlayerHit() {
  playTone(100, 0.2, 'sawtooth', 0.08)
  setTimeout(() => playTone(80, 0.25, 'triangle', 0.06), 80)
  vibrate(50)
}

export function playPowerup() {
  playTone(880, 0.06, 'sine', 0.05)
  setTimeout(() => playTone(1100, 0.06, 'sine', 0.05), 50)
  setTimeout(() => playTone(1320, 0.1, 'sine', 0.05), 100)
  vibrate(10)
}

export function playWave() {
  playTone(440, 0.1, 'sine', 0.04)
  setTimeout(() => playTone(660, 0.1, 'sine', 0.04), 100)
  setTimeout(() => playTone(880, 0.15, 'sine', 0.05), 200)
}

export function playGameOver() {
  playTone(440, 0.2, 'square', 0.07)
  setTimeout(() => playTone(330, 0.2, 'square', 0.06), 150)
  setTimeout(() => playTone(220, 0.3, 'triangle', 0.05), 300)
  setTimeout(() => playTone(110, 0.5, 'triangle', 0.04), 450)
  vibrate(200)
}
