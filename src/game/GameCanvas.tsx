import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { useCosmicDefender } from './useCosmicDefender.ts'
import { render } from './renderer.ts'
import type { JoystickVisual } from './renderer.ts'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './types.ts'
import type { Phase } from './types.ts'

interface Props {
  readonly onStateChange?: (state: {
    phase: Phase
    score: number
    bestScore: number
    wave: number
    health: number
  }) => void
}

export interface GameCanvasHandle {
  readonly startGame: () => void
  readonly restartGame: () => void
}

const JOYSTICK_RADIUS = 40

const GameCanvas = forwardRef<GameCanvasHandle, Props>(({ onStateChange }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { state, frame, inputRef, startGame, restartGame } = useCosmicDefender(onStateChange)
  const joystickRef = useRef<JoystickVisual & { touchId: number }>({
    active: false,
    touchId: -1,
    baseX: 0,
    baseY: 0,
    thumbX: 0,
    thumbY: 0,
  })

  useImperativeHandle(ref, () => ({
    startGame,
    restartGame,
  }), [startGame, restartGame])

  const getCanvasPos = useCallback((touch: Touch) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: (touch.clientX - rect.left) * (CANVAS_WIDTH / rect.width),
      y: (touch.clientY - rect.top) * (CANVAS_HEIGHT / rect.height),
    }
  }, [])

  // Touch: virtual joystick
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]
        if (joystickRef.current.touchId === -1) {
          const pos = getCanvasPos(touch)
          joystickRef.current = {
            active: true,
            touchId: touch.identifier,
            baseX: pos.x,
            baseY: pos.y,
            thumbX: pos.x,
            thumbY: pos.y,
          }
          inputRef.current.joystickActive = true
          inputRef.current.joystickX = 0
          inputRef.current.joystickY = 0
        }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]
        if (touch.identifier === joystickRef.current.touchId) {
          const pos = getCanvasPos(touch)
          const dx = pos.x - joystickRef.current.baseX
          const dy = pos.y - joystickRef.current.baseY
          const dist = Math.sqrt(dx * dx + dy * dy)
          const clampedDist = Math.min(dist, JOYSTICK_RADIUS)
          const angle = Math.atan2(dy, dx)

          joystickRef.current = {
            ...joystickRef.current,
            thumbX: joystickRef.current.baseX + Math.cos(angle) * clampedDist,
            thumbY: joystickRef.current.baseY + Math.sin(angle) * clampedDist,
          }
          inputRef.current.joystickX = dist > 0 ? (clampedDist / JOYSTICK_RADIUS) * Math.cos(angle) : 0
          inputRef.current.joystickY = dist > 0 ? (clampedDist / JOYSTICK_RADIUS) * Math.sin(angle) : 0
        }
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault()
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]
        if (touch.identifier === joystickRef.current.touchId) {
          joystickRef.current = {
            active: false,
            touchId: -1,
            baseX: 0,
            baseY: 0,
            thumbX: 0,
            thumbY: 0,
          }
          inputRef.current.joystickActive = false
          inputRef.current.joystickX = 0
          inputRef.current.joystickY = 0
        }
      }
    }

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false })
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false })

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchmove', handleTouchMove)
      canvas.removeEventListener('touchend', handleTouchEnd)
      canvas.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [inputRef, getCanvasPos])

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let rafId = 0
    const draw = () => {
      render(ctx, state.current, frame.current, joystickRef.current)
      rafId = requestAnimationFrame(draw)
    }
    rafId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafId)
  }, [state, frame])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 'a', 's', 'd'].includes(e.key)) {
        e.preventDefault()
      }
      inputRef.current.keys[e.key] = true
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      inputRef.current.keys[e.key] = false
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [inputRef])

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        touchAction: 'none',
        borderRadius: '12px',
      }}
    />
  )
})

GameCanvas.displayName = 'GameCanvas'
export default GameCanvas
