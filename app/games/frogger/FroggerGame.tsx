'use client';

import { useEffect, useRef, useCallback, type MutableRefObject } from 'react';
import { SKINS, type Skin } from './skins';
import type { GamepadButton } from '@/app/games/_components/TouchGamepad';

// ── Constantes del mapa ────────────────────────────────────────────────────
const COLS = 16;
const ROWS = 14;
const CELL = 40;
const CANVAS_W = COLS * CELL; // 640
const CANVAS_H = ROWS * CELL; // 560

// Zonas (índice de fila, 0 = arriba)
const ROW_GOALS     = 0;
const ROW_RIVER_TOP = 1;
const ROW_RIVER_BOT = 6;
const ROW_SAFE_MID  = 7;
const ROW_ROAD_TOP  = 8;
const ROW_ROAD_BOT  = 12;
const ROW_START     = 13;

// ── Tipos locales ──────────────────────────────────────────────────────────
type Direction = 'up' | 'down' | 'left' | 'right';

interface Entity {
  col: number;
  width: number;
  type: 'car' | 'truck' | 'log' | 'turtle';
  submerged?: boolean;
  submergeTimer?: number;
  submergePhase?: 'visible' | 'submerged';
}

interface Lane {
  row: number;
  speed: number;
  dir: 1 | -1;
  entities: Entity[];
}

interface Frog {
  col: number;
  row: number;
  animating: boolean;
  animT: number;
  targetCol: number;
  targetRow: number;
}

// ── Props del componente ───────────────────────────────────────────────────
interface FroggerGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  skinKey?: string;
  /** Ref que la play-page puede usar para pasar input del TouchGamepad */
  sendInputRef?: MutableRefObject<((b: GamepadButton, pressed: boolean) => void) | null>;
}

export default function FroggerGame({
  paused,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
  skinKey = 'classic',
  sendInputRef,
}: FroggerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef        = useRef(paused);
  const onScoreRef       = useRef(onScoreChange);
  const onLivesRef       = useRef(onLivesChange);
  const onLevelRef       = useRef(onLevelChange);
  const onGameOverRef    = useRef(onGameOver);
  const skinRef          = useRef<Skin>(SKINS[skinKey] ?? SKINS.classic);
  // pendingDir como ref del componente para que sendInputRef pueda escribirla
  const pendingDirRef    = useRef<Direction | null>(null);

  useEffect(() => { pausedRef.current     = paused;         }, [paused]);
  useEffect(() => { onScoreRef.current    = onScoreChange;  }, [onScoreChange]);
  useEffect(() => { onLivesRef.current    = onLivesChange;  }, [onLivesChange]);
  useEffect(() => { onLevelRef.current    = onLevelChange;  }, [onLevelChange]);
  useEffect(() => { onGameOverRef.current = onGameOver;     }, [onGameOver]);
  useEffect(() => { skinRef.current       = SKINS[skinKey] ?? SKINS.classic; }, [skinKey]);

  const startLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Registrar sendInput en el ref externo para que TouchGamepad pueda usarlo
    if (sendInputRef) {
      sendInputRef.current = (button: GamepadButton, pressed: boolean) => {
        if (!pressed) return; // Frogger usa input discreto
        const map: Record<string, Direction> = {
          up: 'up', down: 'down', left: 'left', right: 'right',
        };
        const dir = map[button];
        if (dir) pendingDirRef.current = dir;
      };
    }

    // ── Estado de la partida ───────────────────────────────────────────────
    let lives = 3;
    let score = 0;
    let level = 1;
    let gameOver = false;
    let roundTimer = 25;
    let goals: boolean[] = Array(5).fill(false);
    let rafId = 0;
    let lastTime = performance.now();

    // ── Rana ──────────────────────────────────────────────────────────────
    const frog: Frog = {
      col: Math.floor(COLS / 2),
      row: ROW_START,
      animating: false,
      animT: 0,
      targetCol: Math.floor(COLS / 2),
      targetRow: ROW_START,
    };

    // Filas ya avanzadas para evitar doble puntuación hacia arriba
    let highestRow = ROW_START;

    // ── Carriles ──────────────────────────────────────────────────────────
    let lanes: Lane[] = buildLanes(level);

    // ── Input ─────────────────────────────────────────────────────────────
    function onKey(e: KeyboardEvent) {
      if (gameOver) return;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
      const map: Record<string, Direction> = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', s: 'down', a: 'left', d: 'right',
      };
      if (map[e.key] && !frog.animating) pendingDirRef.current = map[e.key];
    }
    document.addEventListener('keydown', onKey);

    // ── Loop ──────────────────────────────────────────────────────────────
    function tick(now: number) {
      if (gameOver) return;
      const dt = Math.min(now - lastTime, 50);
      lastTime = now;

      if (!pausedRef.current) update(dt);
      draw(ctx!);
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    // ── Cleanup ───────────────────────────────────────────────────────────
    return () => {
      document.removeEventListener('keydown', onKey);
      cancelAnimationFrame(rafId);
      if (sendInputRef) sendInputRef.current = null;
    };

    // ────────────────────────────────────────────────────────────────────
    // FUNCIONES DE LÓGICA
    // ────────────────────────────────────────────────────────────────────

    function buildLanes(lvl: number): Lane[] {
      const speedScale = Math.pow(1.15, lvl - 1);
      const result: Lane[] = [];

      const roadConfigs: { row: number; speed: number; dir: 1 | -1 }[] = [
        { row: 12, speed: 0.05, dir:  1 },
        { row: 11, speed: 0.05, dir: -1 },
        { row: 10, speed: 0.05, dir:  1 },
        { row:  9, speed: 0.05, dir: -1 },
        { row:  8, speed: 0.05, dir:  1 },
      ];

      for (const cfg of roadConfigs) {
        const entities: Entity[] = [];
        // Dividir el carril en N slots iguales; poner un vehículo en cada slot
        // garantiza huecos navegables entre slots
        const num = 2 + Math.floor(Math.random() * 2); // 2-3 vehículos
        const slot = Math.floor(COLS / num);
        for (let i = 0; i < num; i++) {
          const type: 'car' | 'truck' = Math.random() < 0.6 ? 'car' : 'truck';
          const width = type === 'car' ? 1 + Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 2);
          const maxOff = Math.max(0, slot - width - 2);
          const col = i * slot + Math.floor(Math.random() * (maxOff + 1));
          entities.push({ col, width, type });
        }
        result.push({ row: cfg.row, speed: cfg.speed * speedScale, dir: cfg.dir, entities });
      }

      const riverConfigs: { row: number; speed: number; dir: 1 | -1; type: 'log' | 'turtle' }[] = [
        { row: 6, speed: 0.05, dir:  1, type: 'log'    },
        { row: 5, speed: 0.05, dir: -1, type: 'turtle' },
        { row: 4, speed: 0.05, dir:  1, type: 'log'    },
        { row: 3, speed: 0.05, dir: -1, type: 'turtle' },
        { row: 2, speed: 0.05, dir:  1, type: 'log'    },
        { row: 1, speed: 0.05, dir: -1, type: 'turtle' },
      ];

      for (const cfg of riverConfigs) {
        const entities: Entity[] = [];
        const num = 2 + Math.floor(Math.random() * 2); // 2-3 plataformas
        const slot = Math.floor(COLS / num);
        for (let i = 0; i < num; i++) {
          if (cfg.type === 'log') {
            const width = 2 + Math.floor(Math.random() * 3);
            const maxOff = Math.max(0, slot - width);
            const col = i * slot + Math.floor(Math.random() * (maxOff + 1));
            entities.push({ col, width, type: 'log' });
          } else {
            const groupSize = 2 + Math.floor(Math.random() * 2);
            const maxOff = Math.max(0, slot - groupSize);
            const col = i * slot + Math.floor(Math.random() * (maxOff + 1));
            for (let j = 0; j < groupSize; j++) {
              entities.push({
                col: col + j,
                width: 1,
                type: 'turtle',
                submerged: false,
                submergeTimer: 3000 + Math.random() * 1000,
                submergePhase: 'visible',
              });
            }
          }
        }
        result.push({ row: cfg.row, speed: cfg.speed * speedScale, dir: cfg.dir, entities });
      }

      return result;
    }

    function update(dt: number) {
      // Avanzar entidades
      for (const lane of lanes) {
        for (const e of lane.entities) {
          e.col += lane.speed * lane.dir * dt / 16;
          if (lane.dir === 1 && e.col > COLS) e.col = -e.width;
          if (lane.dir === -1 && e.col + e.width < 0) e.col = COLS;

          // Ciclo de inmersión de tortugas
          if (e.type === 'turtle' && e.submergeTimer !== undefined) {
            e.submergeTimer -= dt;
            if (e.submergeTimer <= 0) {
              if (e.submergePhase === 'visible') {
                e.submerged = true;
                e.submergePhase = 'submerged';
                e.submergeTimer = 1500;
              } else {
                e.submerged = false;
                e.submergePhase = 'visible';
                e.submergeTimer = 3000 + Math.random() * 1000;
              }
            }
          }
        }
      }

      // Temporizador de ronda
      roundTimer -= dt / 1000;
      if (roundTimer <= 0) {
        killFrog();
        return;
      }

      // Animación de la rana
      if (frog.animating) {
        frog.animT += dt;
        if (frog.animT >= 120) {
          frog.col = frog.targetCol;
          frog.row = frog.targetRow;
          frog.animating = false;
          resolveCell();
        }
      } else {
        // Mover con la plataforma en el río / detectar muerte continua
        if (frog.row >= ROW_RIVER_TOP && frog.row <= ROW_RIVER_BOT) {
          const support = getSupport(frog);
          if (support) {
            const lane = lanes.find(l => l.row === frog.row)!;
            frog.col += lane.speed * lane.dir * dt / 16;
          } else {
            killFrog();
            return;
          }
        }

        // Detección continua de colisión en carretera
        if (frog.row >= ROW_ROAD_TOP && frog.row <= ROW_ROAD_BOT) {
          if (checkRoadCollision()) { killFrog(); return; }
        }

        // Procesar input
        if (pendingDirRef.current) {
          const dir = pendingDirRef.current;
          pendingDirRef.current = null;
          let nc = frog.col;
          let nr = frog.row;
          if (dir === 'up')    nr--;
          if (dir === 'down')  nr++;
          if (dir === 'left')  nc--;
          if (dir === 'right') nc++;

          if (nc < 0 || nc >= COLS) return; // borde lateral
          if (nr < 0 || nr >= ROWS)  return; // borde vertical

          frog.animating = true;
          frog.animT = 0;
          frog.targetCol = nc;
          frog.targetRow = nr;
        }
      }
    }

    function resolveCell() {
      // Puntuación por avance hacia arriba
      if (frog.row < highestRow) {
        const cells = highestRow - frog.row;
        addScore(cells * 10);
        highestRow = frog.row;
      }

      // Zona meta
      if (frog.row === ROW_GOALS) {
        checkGoal();
        return;
      }

      // Carretera
      if (frog.row >= ROW_ROAD_TOP && frog.row <= ROW_ROAD_BOT) {
        if (checkRoadCollision()) killFrog();
        return;
      }

      // Río
      if (frog.row >= ROW_RIVER_TOP && frog.row <= ROW_RIVER_BOT) {
        const support = getSupport(frog);
        if (!support) killFrog();
        return;
      }
    }

    function getSupport(f: Frog): Entity | null {
      const lane = lanes.find(l => l.row === f.row);
      if (!lane) return null;
      const center = f.col + 0.5; // centro de la rana
      for (const e of lane.entities) {
        if (e.type !== 'log' && e.type !== 'turtle') continue;
        if (e.type === 'turtle' && e.submerged) continue;
        if (center >= e.col && center < e.col + e.width) return e;
      }
      return null;
    }

    function checkRoadCollision(): boolean {
      const lane = lanes.find(l => l.row === frog.row);
      if (!lane) return false;
      // Hitbox reducido: solo el 70% central del cell de la rana
      const frogLeft  = frog.col + 0.15;
      const frogRight = frog.col + 0.85;
      for (const e of lane.entities) {
        if (e.type !== 'car' && e.type !== 'truck') continue;
        if (frogLeft < e.col + e.width && frogRight > e.col) return true;
      }
      return false;
    }

    function checkGoal() {
      // Bocas destino: columnas pares 1,4,7,10,13 (5 bocas de 2 cols cada una con 1 col de separación)
      const goalCols = [1, 4, 7, 10, 13];
      const goalIdx = goalCols.findIndex(gc => frog.col === gc || frog.col === gc + 1);
      if (goalIdx === -1) {
        killFrog();
        return;
      }
      if (goals[goalIdx]) {
        killFrog();
        return;
      }
      goals[goalIdx] = true;
      const timeBonus = Math.floor(roundTimer * 10);
      addScore(50 + timeBonus);

      if (goals.every(Boolean)) {
        completeRound();
      } else {
        resetFrogPosition();
      }
    }

    function completeRound() {
      addScore(200);
      level++;
      onLevelRef.current(level);
      goals = Array(5).fill(false);
      lanes = buildLanes(level);
      roundTimer = Math.max(15, 25 - (level - 1) * 1);
      resetFrogPosition();
    }

    function killFrog() {
      lives--;
      onLivesRef.current(lives);
      if (lives <= 0) {
        gameOver = true;
        onLivesRef.current(0);
        onGameOverRef.current(score);
        return;
      }
      roundTimer = Math.max(15, 25 - (level - 1) * 1);
      resetFrogPosition();
    }

    function resetFrogPosition() {
      frog.col = Math.floor(COLS / 2);
      frog.row = ROW_START;
      frog.animating = false;
      frog.animT = 0;
      frog.targetCol = frog.col;
      frog.targetRow = frog.row;
      highestRow = ROW_START;
    }

    function addScore(pts: number) {
      score += pts;
      onScoreRef.current(score);
    }

    // ────────────────────────────────────────────────────────────────────
    // DRAW
    // ────────────────────────────────────────────────────────────────────

    function draw(c: CanvasRenderingContext2D) {
      const s = skinRef.current;

      if (s.boardBg) {
        c.fillStyle = s.boardBg;
        c.fillRect(0, 0, CANVAS_W, CANVAS_H);
      } else {
        c.clearRect(0, 0, CANVAS_W, CANVAS_H);
      }

      // Fondo por zonas
      for (let row = 0; row < ROWS; row++) {
        if (row === ROW_GOALS) {
          c.fillStyle = s.goalBg;
        } else if (row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT) {
          c.fillStyle = s.riverBg;
        } else if (row === ROW_SAFE_MID || row === ROW_START) {
          c.fillStyle = s.safeBg;
        } else {
          c.fillStyle = s.roadBg;
        }
        c.fillRect(0, row * CELL, CANVAS_W, CELL);
      }

      // Rayas de carretera
      c.strokeStyle = s.roadDash;
      c.lineWidth = 1;
      for (let row = ROW_ROAD_TOP; row <= ROW_ROAD_BOT; row++) {
        c.beginPath();
        c.setLineDash([8, 8]);
        c.moveTo(0, row * CELL + CELL / 2);
        c.lineTo(CANVAS_W, row * CELL + CELL / 2);
        c.stroke();
      }
      c.setLineDash([]);

      // Bocas destino — solo se dibuja cuando están ocupadas
      const goalCols = [1, 4, 7, 10, 13];
      for (let i = 0; i < 5; i++) {
        if (!goals[i]) continue;
        const gc = goalCols[i];
        const x = gc * CELL;
        const y = ROW_GOALS * CELL;
        c.fillStyle = s.goalFilled;
        c.fillRect(x, y, CELL * 2, CELL);
        if (s.shadowBlur > 0) {
          c.shadowBlur = s.shadowBlur;
          c.shadowColor = s.shadowColor;
        }
        drawFrogIcon(c, x + CELL, y + CELL / 2, s.frogColor, 10);
        c.shadowBlur = 0;
      }

      // Entidades
      for (const lane of lanes) {
        for (const e of lane.entities) {
          drawEntity(c, e, lane.row);
        }
      }

      // Rana
      drawFrog(c);

      // HUD interno
      drawHUD(c);
    }

    function drawEntity(c: CanvasRenderingContext2D, e: Entity, row: number) {
      const s = skinRef.current;
      const x = e.col * CELL;
      const y = row * CELL;
      const w = e.width * CELL;

      if (e.type === 'car') {
        const color = s.carColors[Math.floor((row + e.col) % s.carColors.length)];
        if (s.shadowBlur > 0) {
          c.shadowBlur = s.shadowBlur * 0.6;
          c.shadowColor = color;
        }
        c.fillStyle = color;
        c.fillRect(x + 2, y + 6, w - 4, CELL - 12);
        // Highlight CRT retro en borde superior
        if (s.retroHighlight) {
          c.fillStyle = 'rgba(255,255,255,0.15)';
          c.fillRect(x + 2, y + 6, w - 4, 4);
        }
        c.shadowBlur = 0;
        // Ruedas
        c.fillStyle = s.wheelColor;
        c.beginPath(); c.arc(x + 8, y + CELL - 8, 5, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(x + w - 8, y + CELL - 8, 5, 0, Math.PI * 2); c.fill();
      } else if (e.type === 'truck') {
        if (s.shadowBlur > 0) {
          c.shadowBlur = s.shadowBlur * 0.6;
          c.shadowColor = s.truckBody;
        }
        c.fillStyle = s.truckBody;
        c.fillRect(x + 2, y + 4, w - 4, CELL - 8);
        // Highlight CRT retro
        if (s.retroHighlight) {
          c.fillStyle = 'rgba(255,255,255,0.15)';
          c.fillRect(x + 2, y + 4, w - 4, 4);
        }
        c.shadowBlur = 0;
        c.fillStyle = s.truckCabin;
        c.fillRect(x + w - CELL + 2, y + 4, CELL - 4, CELL - 8);
        c.fillStyle = s.wheelColor;
        c.beginPath(); c.arc(x + 8, y + CELL - 8, 5, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(x + w - 8, y + CELL - 8, 5, 0, Math.PI * 2); c.fill();
      } else if (e.type === 'log') {
        if (s.shadowBlur > 0) {
          c.shadowBlur = s.shadowBlur * 0.5;
          c.shadowColor = s.logColor;
        }
        c.fillStyle = s.logColor;
        c.fillRect(x + 1, y + 6, w - 2, CELL - 12);
        // Highlight CRT retro
        if (s.retroHighlight) {
          c.fillStyle = 'rgba(255,255,255,0.15)';
          c.fillRect(x + 1, y + 6, w - 2, 4);
        }
        c.shadowBlur = 0;
        c.strokeStyle = s.logGrain;
        c.lineWidth = 1;
        for (let i = 1; i < e.width; i++) {
          c.beginPath();
          c.moveTo(x + i * CELL, y + 6);
          c.lineTo(x + i * CELL, y + CELL - 6);
          c.stroke();
        }
      } else if (e.type === 'turtle') {
        if (e.submerged) {
          c.globalAlpha = 0.3;
          c.fillStyle = s.turtleSubmerged;
          c.beginPath();
          c.ellipse(x + CELL / 2, y + CELL / 2, 14, 10, 0, 0, Math.PI * 2);
          c.fill();
          c.globalAlpha = 1;
        } else {
          if (s.shadowBlur > 0) {
            c.shadowBlur = s.shadowBlur * 0.7;
            c.shadowColor = s.turtleColor;
          }
          c.fillStyle = s.turtleColor;
          c.beginPath();
          c.ellipse(x + CELL / 2, y + CELL / 2, 14, 10, 0, 0, Math.PI * 2);
          c.fill();
          c.shadowBlur = 0;
          c.strokeStyle = s.turtleShell;
          c.lineWidth = 1;
          c.beginPath();
          c.ellipse(x + CELL / 2, y + CELL / 2, 8, 6, 0, 0, Math.PI * 2);
          c.stroke();
        }
      }
    }

    function drawFrog(c: CanvasRenderingContext2D) {
      const s = skinRef.current;
      let x: number, y: number;
      if (frog.animating) {
        const t = frog.animT / 120;
        x = (frog.col + (frog.targetCol - frog.col) * t) * CELL + CELL / 2;
        y = (frog.row + (frog.targetRow - frog.row) * t) * CELL + CELL / 2;
      } else {
        x = frog.col * CELL + CELL / 2;
        y = frog.row * CELL + CELL / 2;
      }
      drawFrogIcon(c, x, y, s.frogColor, 14);
    }

    function drawFrogIcon(c: CanvasRenderingContext2D, x: number, y: number, color: string, size: number) {
      const s = skinRef.current;
      // Glow solo para neon
      if (s.shadowBlur > 0) {
        c.shadowBlur = s.shadowBlur;
        c.shadowColor = s.shadowColor;
      }
      // Cuerpo
      c.fillStyle = color;
      c.beginPath();
      c.ellipse(x, y, size, size * 0.85, 0, 0, Math.PI * 2);
      c.fill();
      c.shadowBlur = 0;
      // Ojos
      c.fillStyle = '#fff';
      c.beginPath(); c.arc(x - size * 0.4, y - size * 0.4, size * 0.25, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(x + size * 0.4, y - size * 0.4, size * 0.25, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#000';
      c.beginPath(); c.arc(x - size * 0.4, y - size * 0.4, size * 0.12, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(x + size * 0.4, y - size * 0.4, size * 0.12, 0, Math.PI * 2); c.fill();
      // Contorno neon
      if (s.shadowBlur > 0) {
        c.shadowBlur = s.shadowBlur * 0.5;
        c.shadowColor = s.shadowColor;
        c.strokeStyle = s.shadowColor;
        c.lineWidth = 1;
        c.beginPath();
        c.ellipse(x, y, size, size * 0.85, 0, 0, Math.PI * 2);
        c.stroke();
        c.shadowBlur = 0;
      }
    }

    function drawHUD(c: CanvasRenderingContext2D) {
      const s = skinRef.current;
      c.font = '14px "Courier New", monospace';

      // Score top-left
      c.fillStyle = s.hudColor;
      c.textAlign = 'left';
      c.fillText(`${score}`, 8, 20);

      // Nivel top-center
      c.textAlign = 'center';
      c.fillText(`NVL ${level}`, CANVAS_W / 2, 20);

      // Vidas top-right (iconos de rana)
      for (let i = 0; i < lives; i++) {
        drawFrogIcon(c, CANVAS_W - 16 - i * 22, 16, s.frogColor, 8);
      }

      // Barra de tiempo — fila inferior, 10px de alto para que sea visible
      const timerMax = Math.max(15, 25 - (level - 1) * 1);
      const ratio = Math.max(0, roundTimer / timerMax);
      const barColor = ratio > 0.5 ? s.frogColor : ratio > 0.25 ? '#eab308' : '#ef4444';
      c.fillStyle = s.timerBarBg;
      c.fillRect(0, CANVAS_H - 10, CANVAS_W, 10);
      if (s.shadowBlur > 0) {
        c.shadowBlur = s.shadowBlur * 0.5;
        c.shadowColor = barColor;
      }
      c.fillStyle = barColor;
      c.fillRect(0, CANVAS_H - 10, CANVAS_W * ratio, 10);
      c.shadowBlur = 0;
      c.fillStyle = 'rgba(255,255,255,0.5)';
      c.font = '9px monospace';
      c.textAlign = 'right';
      c.fillText(`${Math.ceil(roundTimer)}s`, CANVAS_W - 4, CANVAS_H - 2);
    }

  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const cleanup = startLoop();
    return cleanup;
  }, [startLoop]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
