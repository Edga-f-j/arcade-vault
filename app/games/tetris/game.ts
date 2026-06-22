const COLS = 10
const ROWS = 20
const BLOCK = 30

const COLORS: Record<string, string> = {
  I: '#00f0f0',
  O: '#f0f000',
  T: '#a000f0',
  S: '#00f000',
  Z: '#f00000',
  J: '#0000f0',
  L: '#f0a000',
}

const SHAPES: Record<string, number[][]> = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
}

const PIECE_KEYS = Object.keys(SHAPES)
const LINE_SCORES = [0, 100, 300, 500, 800]

type Cell = string | null
type Matrix = Cell[][]
type GameState = { score: number; lines: number; level: number; gameOver?: boolean }

function createMatrix(rows: number, cols: number): Matrix {
  return Array.from({ length: rows }, () => Array(cols).fill(null))
}

function rotate(matrix: number[][]): number[][] {
  const rows = matrix.length
  const cols = matrix[0].length
  const result: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0))
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      result[c][rows - 1 - r] = matrix[r][c]
    }
  }
  return result
}

function randomPiece() {
  const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)]
  return { key, shape: SHAPES[key].map((r) => [...r]) }
}

type GamepadButton = 'up' | 'down' | 'left' | 'right' | 'a' | 'b'

export function startGame(
  canvas: HTMLCanvasElement,
  nextCanvas: HTMLCanvasElement,
  onStateChange?: (state: GameState) => void
): { cleanup: () => void; setPaused: (p: boolean) => void; sendInput: (button: GamepadButton, pressed: boolean) => void } {
  const ctx = canvas.getContext('2d')!
  const nextCtx = nextCanvas.getContext('2d')!

  const board: Matrix = createMatrix(ROWS, COLS)

  let current = randomPiece()
  let next = randomPiece()
  let pos = { x: Math.floor(COLS / 2) - Math.floor(current.shape[0].length / 2), y: 0 }

  let score = 0
  let lines = 0
  let level = 1

  let prevScore = -1
  let prevLines = -1
  let prevLevel = -1

  let isPaused = false
  let isOver = false
  let rafId = 0
  let lastTime: number | null = null
  let dropAccum = 0

  function dropInterval() {
    return Math.max(100, 1000 - (level - 1) * 90)
  }

  function notifyState() {
    if (!onStateChange) return
    if (score !== prevScore || lines !== prevLines || level !== prevLevel) {
      prevScore = score
      prevLines = lines
      prevLevel = level
      onStateChange({ score, lines, level })
    }
  }

  function collides(shape: number[][], px: number, py: number) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue
        const nx = px + c
        const ny = py + r
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true
        if (ny >= 0 && board[ny][nx]) return true
      }
    }
    return false
  }

  function place() {
    for (let r = 0; r < current.shape.length; r++) {
      for (let c = 0; c < current.shape[r].length; c++) {
        if (!current.shape[r][c]) continue
        const ny = pos.y + r
        if (ny < 0) {
          endGame()
          return
        }
        board[ny][pos.x + c] = current.key
      }
    }
    clearLines()
    spawnNext()
  }

  function clearLines() {
    let cleared = 0
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((c) => c !== null)) {
        board.splice(r, 1)
        board.unshift(Array(COLS).fill(null))
        cleared++
        r++
      }
    }
    if (cleared > 0) {
      lines += cleared
      score += (LINE_SCORES[cleared] ?? 0) * level
      level = Math.floor(lines / 10) + 1
      notifyState()
    }
  }

  function spawnNext() {
    current = next
    next = randomPiece()
    pos = { x: Math.floor(COLS / 2) - Math.floor(current.shape[0].length / 2), y: 0 }
    if (collides(current.shape, pos.x, pos.y)) {
      endGame()
    }
  }

  function endGame() {
    isOver = true
    cancelAnimationFrame(rafId)
    onStateChange?.({ score, lines, level, gameOver: true })
  }

  function drawBlock(context: CanvasRenderingContext2D, x: number, y: number, color: string) {
    context.fillStyle = color
    context.fillRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, BLOCK - 2)
    context.fillStyle = 'rgba(255,255,255,0.15)'
    context.fillRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, 4)
  }

  function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = board[r][c]
        if (cell) drawBlock(ctx, c, r, COLORS[cell])
      }
    }

    for (let r = 0; r < current.shape.length; r++) {
      for (let c = 0; c < current.shape[r].length; c++) {
        if (current.shape[r][c]) {
          drawBlock(ctx, pos.x + c, pos.y + r, COLORS[current.key])
        }
      }
    }

    // ghost piece
    let ghostY = pos.y
    while (!collides(current.shape, pos.x, ghostY + 1)) ghostY++
    if (ghostY !== pos.y) {
      ctx.globalAlpha = 0.25
      for (let r = 0; r < current.shape.length; r++) {
        for (let c = 0; c < current.shape[r].length; c++) {
          if (current.shape[r][c]) {
            drawBlock(ctx, pos.x + c, ghostY + r, COLORS[current.key])
          }
        }
      }
      ctx.globalAlpha = 1
    }

    // grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 0.5
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath()
      ctx.moveTo(c * BLOCK, 0)
      ctx.lineTo(c * BLOCK, canvas.height)
      ctx.stroke()
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath()
      ctx.moveTo(0, r * BLOCK)
      ctx.lineTo(canvas.width, r * BLOCK)
      ctx.stroke()
    }
  }

  function drawNext() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height)
    nextCtx.fillStyle = '#000'
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height)

    const shape = next.shape
    const color = COLORS[next.key]
    const offX = Math.floor((4 - shape[0].length) / 2)
    const offY = Math.floor((4 - shape.length) / 2)

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          nextCtx.fillStyle = color
          nextCtx.fillRect((offX + c) * 30 + 1, (offY + r) * 30 + 1, 28, 28)
          nextCtx.fillStyle = 'rgba(255,255,255,0.15)'
          nextCtx.fillRect((offX + c) * 30 + 1, (offY + r) * 30 + 1, 28, 4)
        }
      }
    }
  }

  function loop(ts: number) {
    if (isOver) return
    rafId = requestAnimationFrame(loop)

    if (isPaused) {
      lastTime = null
      return
    }

    if (!lastTime) {
      lastTime = ts
      return
    }

    const dt = ts - lastTime
    lastTime = ts
    dropAccum += dt

    if (dropAccum >= dropInterval()) {
      dropAccum = 0
      if (!collides(current.shape, pos.x, pos.y + 1)) {
        pos.y++
      } else {
        place()
      }
    }

    drawBoard()
    drawNext()
  }

  function actionLeft() {
    if (!collides(current.shape, pos.x - 1, pos.y)) pos.x--
    drawBoard()
  }

  function actionRight() {
    if (!collides(current.shape, pos.x + 1, pos.y)) pos.x++
    drawBoard()
  }

  function actionSoftDrop() {
    if (!collides(current.shape, pos.x, pos.y + 1)) {
      pos.y++
      score += 1
      notifyState()
    } else {
      place()
    }
    drawBoard()
  }

  function actionRotate() {
    const rotated = rotate(current.shape as number[][])
    if (!collides(rotated, pos.x, pos.y)) {
      current.shape = rotated
    } else if (!collides(rotated, pos.x + 1, pos.y)) {
      current.shape = rotated
      pos.x++
    } else if (!collides(rotated, pos.x - 1, pos.y)) {
      current.shape = rotated
      pos.x--
    }
    drawBoard()
  }

  function actionHardDrop() {
    let dropped = 0
    while (!collides(current.shape, pos.x, pos.y + 1)) {
      pos.y++
      dropped++
    }
    score += dropped * 2
    notifyState()
    place()
    drawBoard()
  }

  function onKeyDown(e: KeyboardEvent) {
    if (isOver || isPaused) return

    switch (e.code) {
      case 'ArrowLeft':  actionLeft();     break
      case 'ArrowRight': actionRight();    break
      case 'ArrowDown':  actionSoftDrop(); break
      case 'ArrowUp':
      case 'KeyX':       actionRotate();   break
      case 'Space':
        e.preventDefault()
        actionHardDrop()
        break
    }
  }

  function sendInput(button: GamepadButton, pressed: boolean) {
    if (!pressed || isOver || isPaused) return
    if (button === 'left')  actionLeft()
    if (button === 'right') actionRight()
    if (button === 'down')  actionSoftDrop()
    if (button === 'up')    actionRotate()
    if (button === 'a')     actionHardDrop()
  }

  window.addEventListener('keydown', onKeyDown)

  rafId = requestAnimationFrame(loop)

  function cleanup() {
    cancelAnimationFrame(rafId)
    window.removeEventListener('keydown', onKeyDown)
  }

  function setPaused(p: boolean) {
    isPaused = p
    if (!p) {
      lastTime = null
    }
  }

  return { cleanup, setPaused, sendInput }
}
