import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { useCosmicDefender } from './useCosmicDefender.ts'
import { render } from './renderer.ts'
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
  readonly setMobileInput: (key: string, pressed: boolean) => void
  readonly setMobileShooting: (shooting: boolean) => void
}

const GameCanvas = forwardRef<GameCanvasHandle, Props>(({ onStateChange }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { state, frame, inputRef, startGame, restartGame } = useCosmicDefender(onStateChange)

  useImperativeHandle(ref, () => ({
    startGame,
    restartGame,
    setMobileInput: (key: string, pressed: boolean) => {
      inputRef.current.keys[key] = pressed
    },
    setMobileShooting: (shooting: boolean) => {
      inputRef.current.shooting = shooting
    },
  }), [startGame, restartGame, inputRef])

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let rafId = 0
    const draw = () => {
      render(ctx, state.current, frame.current)
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
