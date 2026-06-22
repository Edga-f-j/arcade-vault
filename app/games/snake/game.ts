import { type Skin } from './skins'

const FRUIT_ATLAS: { x: number; y: number; w: number; h: number }[] = [
  { x: 34, y: 136, w: 110, h: 160 },   // banana
  { x: 186, y: 136, w: 150, h: 160 },  // orange
  { x: 378, y: 136, w: 110, h: 160 },  // grape
  { x: 540, y: 136, w: 130, h: 160 },  // garlic
  { x: 712, y: 136, w: 130, h: 160 },  // eggplant
  { x: 894, y: 136, w: 110, h: 160 },  // strawberry
  { x: 1066, y: 136, w: 110, h: 160 }, // cherry
  { x: 1228, y: 136, w: 130, h: 160 }, // carrot
  { x: 1400, y: 136, w: 130, h: 160 }, // mushroom
  { x: 1582, y: 136, w: 110, h: 160 }, // broccoli
  { x: 1734, y: 136, w: 150, h: 160 }, // watermelon
  { x: 1906, y: 136, w: 150, h: 160 }, // pepper
  { x: 2068, y: 136, w: 170, h: 160 }, // kiwi
  { x: 2250, y: 136, w: 140, h: 160 }, // lemon
  { x: 2432, y: 136, w: 130, h: 160 }, // peach
  { x: 2604, y: 136, w: 130, h: 160 }, // peanut
  { x: 2786, y: 136, w: 110, h: 160 }, // apple
  { x: 2948, y: 136, w: 130, h: 160 }, // tomato
  { x: 3110, y: 136, w: 150, h: 160 }, // berries
  { x: 3302, y: 136, w: 110, h: 160 }, // grapes2
  { x: 3454, y: 136, w: 150, h: 160 }, // pineapple
  { x: 3637, y: 136, w: 130, h: 160 }, // melon
]

const CELL = 30
const COLS = 20
const ROWS = 20
const INITIAL_TICK = 150
const MIN_TICK = 60
const TICK_DECREMENT = 10
const FRUITS_PER_LEVEL = 5
const SCORE_PER_FRUIT = 10
const ROTATIONS = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]

type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
type Cell = { x: number; y: number }
type Fruit = { x: number; y: number; type: number; rotation: number }
type GameState = { score: number; lives: number; level: number }

const OPPOSITE: Record<Dir, Dir> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' }
const DIR_DELTA: Record<Dir, Cell> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
}

function randInt(max: number) {
  return Math.floor(Math.random() * max)
}

export function startGame(
  canvas: HTMLCanvasElement,
  skinRef: { current: Skin },
  onStateChange?: (state: GameState) => void,
  onPauseToggle?: (paused: boolean) => void
): { cleanup: () => void; setPaused: (p: boolean) => void } {
  const ctx = canvas.getContext('2d')!

  let snake: Cell[] = [
    { x: 12, y: 10 },
    { x: 11, y: 10 },
    { x: 10, y: 10 },
  ]
  let dir: Dir = 'RIGHT'
  let nextDir: Dir = 'RIGHT'
  let score = 0
  let lives = 3
  let level = 1
  let fruitsEaten = 0
  let isPaused = false
  let gameOver = false
  let lastTime: number | null = null
  let tickAccumulator = 0
  let rafId = 0
  let prevScore = score
  let prevLives = lives
  let prevLevel = level

  const fruitImg = new Image()
  fruitImg.src = '/games/snake/fruits.png'

  let fruit = spawnFruit()

  function spawnFruit(): Fruit {
    const occupied = new Set(snake.map((c) => `${c.x},${c.y}`))
    let x: number, y: number
    do {
      x = randInt(COLS)
      y = randInt(ROWS)
    } while (occupied.has(`${x},${y}`))
    return {
      x,
      y,
      type: randInt(FRUIT_ATLAS.length),
      rotation: ROTATIONS[randInt(ROTATIONS.length)],
    }
  }

  function resetSnake() {
    snake = [{ x: 12, y: 10 }, { x: 11, y: 10 }, { x: 10, y: 10 }]
    dir = 'RIGHT'
    nextDir = 'RIGHT'
  }

  function tickInterval() {
    return Math.max(MIN_TICK, INITIAL_TICK - (level - 1) * TICK_DECREMENT)
  }

  function notifyState() {
    if (score !== prevScore || lives !== prevLives || level !== prevLevel) {
      prevScore = score
      prevLives = lives
      prevLevel = level
      onStateChange?.({ score, lives, level })
    }
  }

  function tick() {
    dir = nextDir
    const head = snake[0]
    const delta = DIR_DELTA[dir]
    const newHead = { x: head.x + delta.x, y: head.y + delta.y }

    const hitWall =
      newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS
    const hitSelf = snake.some((c) => c.x === newHead.x && c.y === newHead.y)

    if (hitWall || hitSelf) {
      if (lives > 1) {
        lives--
        resetSnake()
        tickAccumulator = 0
        notifyState()
      } else {
        lives = 0
        gameOver = true
        removeListeners()
        notifyState()
        cancelAnimationFrame(rafId)
      }
      return
    }

    snake.unshift(newHead)

    if (newHead.x === fruit.x && newHead.y === fruit.y) {
      score += SCORE_PER_FRUIT * level
      fruitsEaten++
      if (fruitsEaten % FRUITS_PER_LEVEL === 0) {
        level++
      }
      fruit = spawnFruit()
      notifyState()
    } else {
      snake.pop()
    }
  }

  function draw() {
    const skin = skinRef.current
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // grid background
    ctx.fillStyle = skin.boardBg
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // grid lines
    ctx.strokeStyle = skin.gridLineColor
    ctx.lineWidth = 0.5
    for (let i = 0; i <= COLS; i++) {
      ctx.beginPath()
      ctx.moveTo(i * CELL, 0)
      ctx.lineTo(i * CELL, canvas.height)
      ctx.stroke()
    }
    for (let j = 0; j <= ROWS; j++) {
      ctx.beginPath()
      ctx.moveTo(0, j * CELL)
      ctx.lineTo(canvas.width, j * CELL)
      ctx.stroke()
    }

    // snake body
    ctx.fillStyle = skin.snakeBodyColor
    for (let i = 1; i < snake.length; i++) {
      ctx.fillRect(snake[i].x * CELL + 1, snake[i].y * CELL + 1, CELL - 2, CELL - 2)
    }

    // snake head
    ctx.fillStyle = skin.snakeHeadColor
    ctx.fillRect(snake[0].x * CELL + 1, snake[0].y * CELL + 1, CELL - 2, CELL - 2)

    // fruit sprite
    const sprite = FRUIT_ATLAS[fruit.type]
    const drawSize = 28
    const cx = fruit.x * CELL + CELL / 2
    const cy = fruit.y * CELL + CELL / 2
    ctx.save()
    ctx.globalAlpha = skin.fruitAlpha
    ctx.translate(cx, cy)
    ctx.rotate(fruit.rotation)
    ctx.drawImage(
      fruitImg,
      sprite.x, sprite.y, sprite.w, sprite.h,
      -drawSize / 2, -drawSize / 2, drawSize, drawSize
    )
    ctx.restore()
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
    tickAccumulator += ts - lastTime
    lastTime = ts
    const interval = tickInterval()
    while (tickAccumulator >= interval) {
      tick()
      tickAccumulator -= interval
      if (gameOver) return
    }
    draw()
    if (!gameOver) rafId = requestAnimationFrame(loop)
  }

  function onKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        if (dir !== OPPOSITE['UP']) nextDir = 'UP'
        break
      case 'ArrowDown':
      case 's':
      case 'S':
        if (dir !== OPPOSITE['DOWN']) nextDir = 'DOWN'
        break
      case 'ArrowLeft':
      case 'a':
      case 'A':
        if (dir !== OPPOSITE['LEFT']) nextDir = 'LEFT'
        break
      case 'ArrowRight':
      case 'd':
      case 'D':
        if (dir !== OPPOSITE['RIGHT']) nextDir = 'RIGHT'
        break
      case 'p':
      case 'P': {
        const next = !isPaused
        setPaused(next)
        onPauseToggle?.(next)
        break
      }
    }
  }

  function removeListeners() {
    document.removeEventListener('keydown', onKeyDown)
  }

  document.addEventListener('keydown', onKeyDown)
  rafId = requestAnimationFrame(loop)

  function setPaused(p: boolean) {
    isPaused = p
    if (p) lastTime = null
  }

  function cleanup() {
    cancelAnimationFrame(rafId)
    removeListeners()
  }

  return { cleanup, setPaused }
}
