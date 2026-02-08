import { useState, useCallback, useRef } from 'react'
import GameCanvas from './game/GameCanvas.tsx'
import type { GameCanvasHandle } from './game/GameCanvas.tsx'
import type { Phase } from './game/types.ts'
import styles from './App.module.css'

interface UIState {
  phase: Phase
  score: number
  bestScore: number
  wave: number
  health: number
}

export default function App() {
  const gameRef = useRef<GameCanvasHandle>(null)
  const [ui, setUI] = useState<UIState>({
    phase: 'title',
    score: 0,
    bestScore: 0,
    wave: 0,
    health: 100,
  })

  const handleStateChange = useCallback((s: UIState) => {
    setUI(s)
  }, [])

  const handleStart = useCallback(() => {
    gameRef.current?.startGame()
  }, [])

  const handleRestart = useCallback(() => {
    gameRef.current?.restartGame()
  }, [])

  const handleDpadDown = useCallback((key: string) => {
    gameRef.current?.setMobileInput(key, true)
  }, [])

  const handleDpadUp = useCallback((key: string) => {
    gameRef.current?.setMobileInput(key, false)
  }, [])

  const handleFireStart = useCallback(() => {
    gameRef.current?.setMobileShooting(true)
  }, [])

  const handleFireEnd = useCallback(() => {
    gameRef.current?.setMobileShooting(false)
  }, [])

  const isNewBest = ui.score > 0 && ui.score >= ui.bestScore && ui.phase === 'gameover'

  return (
    <div className={styles.container}>
      <div className={styles.starsLayer}>
        {Array.from({ length: 60 }, (_, i) => (
          <span
            key={i}
            className={styles.bgStar}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${1 + Math.random() * 2}px`,
              height: `${1 + Math.random() * 2}px`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className={styles.gameArea}>
        <div className={styles.canvasWrap}>
          <GameCanvas
            ref={gameRef}
            onStateChange={handleStateChange}
          />

          {ui.phase === 'title' && (
            <div className={styles.overlay}>
              <div className={styles.titlePanel}>
                <h1 className={styles.gameTitle}>COSMIC<br />DEFENDER</h1>
                <p className={styles.subtitle}>{'\uC6B0\uC8FC \uC218\uD638\uC790'}</p>
                <button className={styles.startBtn} onClick={handleStart}>
                  START MISSION
                </button>
                {ui.bestScore > 0 && (
                  <div className={styles.titleBest}>
                    {'\uD83C\uDFC6'} BEST: {ui.bestScore}
                  </div>
                )}
                <div className={styles.titleInstructions}>
                  <p>{'\uD83D\uDDA5\uFE0F \uD654\uC0B4\uD45C/WASD \uC774\uB3D9, \uC2A4\uD398\uC774\uC2A4 \uBC1C\uC0AC'}</p>
                  <p>{'\uD83D\uDCF1 \uD130\uCE58 \uCEE8\uD2B8\uB864 \uC9C0\uC6D0'}</p>
                  <p>{'\uD83C\uDFAF \uC801\uC744 \uD30C\uAD34\uD558\uACE0 \uC0B4\uC544\uB0A8\uC73C\uC138\uC694!'}</p>
                </div>
              </div>
            </div>
          )}

          {ui.phase === 'gameover' && (
            <div className={styles.overlay}>
              <div className={styles.gameOverPanel}>
                <div className={styles.gameOverIcon}>{'\uD83D\uDCA5'}</div>
                <h2 className={styles.gameOverTitle}>MISSION FAILED</h2>
                <div className={styles.finalScoreBlock}>
                  <span className={styles.finalLabel}>{'\uCD5C\uC885 \uC810\uC218'}</span>
                  <span className={styles.finalValue}>{ui.score}</span>
                </div>
                <div className={styles.finalStats}>WAVE {ui.wave}</div>
                {isNewBest && (
                  <div className={styles.newBest}>{'\uD83C\uDFC6 \uC2E0\uAE30\uB85D \uB2EC\uC131! \uD83C\uDFC6'}</div>
                )}
                <div className={styles.divider} />
                <div className={styles.bestRow}>
                  <span>{'\uCD5C\uACE0 \uC810\uC218'}</span>
                  <span className={styles.bestValue}>{ui.bestScore}</span>
                </div>
                <button className={styles.retryBtn} onClick={handleRestart}>
                  {'\uD83D\uDD04 \uB2E4\uC2DC \uB3C4\uC804'}
                </button>
              </div>
            </div>
          )}
        </div>

        {ui.phase === 'playing' && (
          <div className={styles.mobileControls}>
            <div className={styles.dpad}>
              <button
                className={`${styles.dpadBtn} ${styles.dpadUp}`}
                onTouchStart={(e) => { e.preventDefault(); handleDpadDown('ArrowUp') }}
                onTouchEnd={() => handleDpadUp('ArrowUp')}
                onMouseDown={() => handleDpadDown('ArrowUp')}
                onMouseUp={() => handleDpadUp('ArrowUp')}
              >{'\u25B2'}</button>
              <button
                className={`${styles.dpadBtn} ${styles.dpadLeft}`}
                onTouchStart={(e) => { e.preventDefault(); handleDpadDown('ArrowLeft') }}
                onTouchEnd={() => handleDpadUp('ArrowLeft')}
                onMouseDown={() => handleDpadDown('ArrowLeft')}
                onMouseUp={() => handleDpadUp('ArrowLeft')}
              >{'\u25C0'}</button>
              <button
                className={`${styles.dpadBtn} ${styles.dpadRight}`}
                onTouchStart={(e) => { e.preventDefault(); handleDpadDown('ArrowRight') }}
                onTouchEnd={() => handleDpadUp('ArrowRight')}
                onMouseDown={() => handleDpadDown('ArrowRight')}
                onMouseUp={() => handleDpadUp('ArrowRight')}
              >{'\u25B6'}</button>
              <button
                className={`${styles.dpadBtn} ${styles.dpadDown}`}
                onTouchStart={(e) => { e.preventDefault(); handleDpadDown('ArrowDown') }}
                onTouchEnd={() => handleDpadUp('ArrowDown')}
                onMouseDown={() => handleDpadDown('ArrowDown')}
                onMouseUp={() => handleDpadUp('ArrowDown')}
              >{'\u25BC'}</button>
            </div>
            <button
              className={styles.fireBtn}
              onTouchStart={(e) => { e.preventDefault(); handleFireStart() }}
              onTouchEnd={handleFireEnd}
              onMouseDown={handleFireStart}
              onMouseUp={handleFireEnd}
            >{'\uD83D\uDD25'}</button>
          </div>
        )}

        <div className={styles.instructions}>
          <p>{'\uD83C\uDFAE \uD654\uC0B4\uD45C/WASD \uC774\uB3D9 | \uC2A4\uD398\uC774\uC2A4 \uBC1C\uC0AC'}</p>
          <p>{'\u2764\uFE0F \uCCB4\uB825 | \u26A1 \uC5F0\uC0AC | \uD83D\uDEE1\uFE0F \uC2E4\uB4DC \uD30C\uC6CC\uC5C5'}</p>
        </div>

        <footer className={styles.footer}>
          Made with {'\u2764\uFE0F'} using React + Vite
        </footer>
      </div>
    </div>
  )
}
