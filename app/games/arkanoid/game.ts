import { loadSpritesheet, drawSprite, drawFrame, EXPLOSION_FRAMES, EXPLOSION_DURATION } from './spritesheet'
import { LEVELS } from './levels'
import type { Skin } from './skins'

type GameStatus = 'playing' | 'gameover' | 'win'

type GameState = {
  score: number
  lives: number
  level: number
  status: GameStatus
}

const PADDLE_SPEED   = 400
const BLOCK_COLS     = 10
const BLOCK_W        = 64
const BLOCK_H        = 24
const BLOCKS_ORIGIN_X = (800 - BLOCK_COLS * BLOCK_W) / 2
const BLOCKS_ORIGIN_Y = 80
const BASE_BALL_VX   = 200
const BASE_BALL_VY   = -300

export function startGame(
  canvas: HTMLCanvasElement,
  skinRef: { current: Skin },
  onStateChange?: (state: GameState) => void
): { cleanup: () => void; setPaused: (p: boolean) => void } {
  const ctx = canvas.getContext('2d')!

  const bounceSound = new Audio('/games/arkanoid/sounds/ball-bounce.mp3')
  const breakSound  = new Audio('/games/arkanoid/sounds/break-sound.mp3')

  const paddle = { x: 0, y: 560, w: 81,  h: 14 }
  const ball   = { x: 0, y: 0,   w: 16,  h: 16, vx: BASE_BALL_VX, vy: BASE_BALL_VY }

  type Block     = { x: number; y: number; w: number; h: number; color: string; alive: boolean }
  type Explosion = { x: number; y: number; w: number; h: number; color: string; elapsed: number }

  let blocks:     Block[]     = []
  let explosions: Explosion[] = []
  let lives        = 3
  let score        = 0
  let gameStatus: GameStatus = 'playing'
  let currentLevel = 1
  let isPaused     = false
  let rafId: number | null = null
  let lastTime: number | null = null

  // guard: only notify when something changed
  let prevScore  = -1
  let prevLives  = -1
  let prevLevel  = -1
  let prevStatus: GameStatus | '' = ''

  function notifyState() {
    if (!onStateChange) return
    if (score !== prevScore || lives !== prevLives || currentLevel !== prevLevel || gameStatus !== prevStatus) {
      prevScore  = score
      prevLives  = lives
      prevLevel  = currentLevel
      prevStatus = gameStatus
      onStateChange({ score, lives, level: currentLevel, status: gameStatus })
    }
  }

  const keys: Record<string, boolean> = { ArrowLeft: false, ArrowRight: false }

  function initPaddle() {
    paddle.x = (canvas.width - paddle.w) / 2
  }

  function loadLevel(n: number) {
    currentLevel = n
    const level  = LEVELS[n - 1]
    blocks = level.blocks.map(b => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }))
    explosions  = []
    ball.x  = paddle.x + (paddle.w - ball.w) / 2
    ball.y  = paddle.y - ball.h
    ball.vx = BASE_BALL_VX * level.speed
    ball.vy = BASE_BALL_VY * level.speed
  }

  function collideAABB(block: Block) {
    return (
      ball.x          < block.x + block.w &&
      ball.x + ball.w > block.x           &&
      ball.y          < block.y + block.h &&
      ball.y + ball.h > block.y
    )
  }

  function playSound(audio: HTMLAudioElement) {
    ;(audio.cloneNode() as HTMLAudioElement).play().catch(() => {})
  }

  function update(dt: number) {
    if (gameStatus !== 'playing') return

    if (keys.ArrowLeft)  paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt)
    if (keys.ArrowRight) paddle.x = Math.min(canvas.width - paddle.w, paddle.x + PADDLE_SPEED * dt)

    ball.x += ball.vx * dt
    ball.y += ball.vy * dt

    if (ball.x <= 0) {
      ball.x  = 0; ball.vx = Math.abs(ball.vx); playSound(bounceSound)
    }
    if (ball.x + ball.w >= canvas.width) {
      ball.x  = canvas.width - ball.w; ball.vx = -Math.abs(ball.vx); playSound(bounceSound)
    }
    if (ball.y <= 0) {
      ball.y  = 0; ball.vy = Math.abs(ball.vy); playSound(bounceSound)
    }

    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x          < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + 8
    ) {
      ball.y  = paddle.y - ball.h
      ball.vy = -Math.abs(ball.vy)
      playSound(bounceSound)
    }

    for (const block of blocks) {
      if (!block.alive) continue
      if (collideAABB(block)) {
        block.alive = false
        explosions.push({ x: block.x, y: block.y, w: block.w, h: block.h, color: block.color, elapsed: 0 })
        score  += 10
        ball.vy = -ball.vy
        playSound(breakSound)
        if (blocks.every(b => !b.alive)) {
          if (currentLevel < 5) loadLevel(currentLevel + 1)
          else gameStatus = 'win'
        }
        break
      }
    }

    for (const exp of explosions) exp.elapsed += dt * 1000
    explosions = explosions.filter(exp => exp.elapsed < EXPLOSION_DURATION)

    if (ball.y > canvas.height) {
      lives--
      if (lives <= 0) {
        lives      = 0
        gameStatus = 'gameover'
      } else {
        ball.x  = paddle.x + (paddle.w - ball.w) / 2
        ball.y  = paddle.y - ball.h
        ball.vx = BASE_BALL_VX * LEVELS[currentLevel - 1].speed
        ball.vy = BASE_BALL_VY * LEVELS[currentLevel - 1].speed
      }
    }

    notifyState()
  }

  function draw() {
    const skin = skinRef.current

    // --- fondo ---
    ctx.fillStyle = skin.boardBg || '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // --- bloques ---
    for (const block of blocks) {
      if (!block.alive) continue

      if (skin.renderMode === 'sprite') {
        drawSprite(ctx, 'block_' + block.color, block.x, block.y, block.w, block.h)
      } else if (skin.renderMode === 'flat') {
        const hex = skin.blockColors[block.color] ?? '#888888'
        ctx.fillStyle = hex
        ctx.fillRect(block.x, block.y, block.w, block.h)
        // highlight CRT (retro): franja blanca semitransparente de 4 px en borde superior
        ctx.fillStyle = 'rgba(255,255,255,0.15)'
        ctx.fillRect(block.x, block.y, block.w, 4)
      } else {
        // neon
        const hex = skin.blockColors[block.color] ?? '#00f5ff'
        ctx.shadowBlur  = skin.shadowBlur
        ctx.shadowColor = hex
        ctx.fillStyle   = hex + '33'  // fill semitransparente
        ctx.fillRect(block.x, block.y, block.w, block.h)
        ctx.shadowBlur  = 0
        ctx.strokeStyle = hex
        ctx.lineWidth   = 1.5
        ctx.strokeRect(block.x + 0.75, block.y + 0.75, block.w - 1.5, block.h - 1.5)
      }
    }

    // --- explosiones ---
    for (const exp of explosions) {
      const frameIndex = Math.min(Math.floor(exp.elapsed / EXPLOSION_DURATION * 4), 3)
      if (skin.renderMode === 'sprite') {
        drawFrame(ctx, EXPLOSION_FRAMES[exp.color][frameIndex], exp.x, exp.y, exp.w, exp.h)
      } else {
        // explosión simplificada para flat/neon: destello de opacidad decreciente
        const alpha = 1 - exp.elapsed / EXPLOSION_DURATION
        const hex   = skin.blockColors[exp.color] ?? '#ffffff'
        ctx.fillStyle = hex + Math.floor(alpha * 200).toString(16).padStart(2, '0')
        ctx.fillRect(exp.x, exp.y, exp.w, exp.h)
      }
    }

    // --- paleta ---
    if (skin.renderMode === 'sprite') {
      drawSprite(ctx, 'paddle', paddle.x, paddle.y, paddle.w, paddle.h)
    } else if (skin.renderMode === 'flat') {
      ctx.fillStyle = skin.paddleColor
      ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h)
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.fillRect(paddle.x, paddle.y, paddle.w, 4)
    } else {
      // neon
      ctx.shadowBlur  = skin.shadowBlur
      ctx.shadowColor = skin.paddleColor
      ctx.fillStyle   = skin.paddleColor + '55'
      ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h)
      ctx.shadowBlur  = 0
      ctx.strokeStyle = skin.paddleColor
      ctx.lineWidth   = 1.5
      ctx.strokeRect(paddle.x + 0.75, paddle.y + 0.75, paddle.w - 1.5, paddle.h - 1.5)
    }

    // --- bola ---
    if (skin.renderMode === 'sprite') {
      drawSprite(ctx, 'ball', ball.x, ball.y, ball.w, ball.h)
    } else if (skin.renderMode === 'flat') {
      ctx.fillStyle = skin.ballColor
      ctx.beginPath()
      ctx.arc(ball.x + ball.w / 2, ball.y + ball.h / 2, ball.w / 2, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // neon
      ctx.shadowBlur  = skin.shadowBlur
      ctx.shadowColor = skin.ballColor
      ctx.fillStyle   = skin.ballColor
      ctx.beginPath()
      ctx.arc(ball.x + ball.w / 2, ball.y + ball.h / 2, ball.w / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur  = 0
    }

    // --- HUD interno ---
    if (gameStatus === 'playing') {
      ctx.shadowBlur   = 0
      ctx.fillStyle    = skin.textColor
      ctx.font         = 'bold 18px monospace'
      ctx.textAlign    = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText('Score: ' + score, 10, 10)
      ctx.textAlign = 'center'
      ctx.fillText('Nivel: ' + currentLevel, canvas.width / 2, 10)

      // vidas: icono de bola o punto según skin
      const ballSize    = 16
      const ballSpacing = 4
      for (let i = 0; i < lives; i++) {
        const bx = canvas.width - 10 - (lives - i) * (ballSize + ballSpacing)
        if (skin.renderMode === 'sprite') {
          drawSprite(ctx, 'ball', bx, 10, ballSize, ballSize)
        } else {
          ctx.fillStyle = skin.ballColor || skin.textColor
          ctx.beginPath()
          ctx.arc(bx + ballSize / 2, 10 + ballSize / 2, ballSize / 2, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
  }

  function loop(ts: number) {
    if (isPaused) {
      lastTime = null
      rafId = requestAnimationFrame(loop)
      return
    }
    if (!lastTime) {
      lastTime = ts
      rafId = requestAnimationFrame(loop)
      return
    }

    const dt = (ts - lastTime) / 1000
    lastTime = ts

    update(dt)
    draw()

    if (gameStatus === 'playing') {
      rafId = requestAnimationFrame(loop)
    } else {
      rafId = null
    }
  }

  function onKeyDown(e: KeyboardEvent) { if (e.key in keys) keys[e.key] = true }
  function onKeyUp(e: KeyboardEvent)   { if (e.key in keys) keys[e.key] = false }
  function onMouseMove(e: MouseEvent) {
    const rect   = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    paddle.x     = Math.max(0, Math.min(canvas.width - paddle.w, (e.clientX - rect.left) * scaleX - paddle.w / 2))
  }

  document.addEventListener('keydown',   onKeyDown)
  document.addEventListener('keyup',     onKeyUp)
  canvas.addEventListener('mousemove',   onMouseMove)

  loadSpritesheet(() => {
    initPaddle()
    loadLevel(1)
    rafId = requestAnimationFrame(loop)
  })

  function cleanup() {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
    document.removeEventListener('keydown',  onKeyDown)
    document.removeEventListener('keyup',    onKeyUp)
    canvas.removeEventListener('mousemove',  onMouseMove)
  }

  function setPaused(p: boolean) { isPaused = p }

  return { cleanup, setPaused }
}
