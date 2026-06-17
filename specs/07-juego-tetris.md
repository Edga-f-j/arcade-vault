# SPEC 07 — Juego: Tetris

> **Status:** aprobado · **Depends on:** 06-leaderboard-catalogo-scores · **Date:** 2026-06-16
> **Objective:** Integrar Tetris (Canvas/JS vanilla) en la plataforma como página
> pública `/games/tetris`, con `game.ts` encapsulado, HUD externo React
> (jugador/puntuación/líneas/nivel), canvas de preview para siguiente pieza,
> y guardado de score en Supabase al game-over.

---

## Scope

**In:**

- `app/games/tetris/game.ts` — `game.js` convertido a módulo ES: encapsula todo
  el estado, exporta `startGame(canvas, nextCanvas, onStateChange?)` y devuelve
  `{ cleanup, setPaused }`
- `app/games/tetris/TetrisGame.tsx` — componente `'use client'` con HUD externo
  (jugador, puntuación, líneas, nivel) + canvas principal + canvas preview
  envueltos en `.crt` / `.crt-screen`
- `app/games/tetris/page.tsx` — Server Component que renderiza `<TetrisGame />`
- Modal de nombre antes de iniciar (input + localStorage `arcade_player_name`)
- Botón PAUSA (congela el loop) y SALIR (vuelve a `/`)
- Guardado de score en Supabase al game-over (`scoreSaved` ref, una sola vez)
- INSERT en tabla `games` con slug `tetris` e `image_url '/games/tetris.png'`

**Out of scope (para specs futuros):**

- Canvas responsivo — tamaño fijo 300×600 (tablero) + 120×120 (preview)
- Autenticación — el jugador se identifica solo por nombre en localStorage
- Mecánica de vidas — Tetris termina al llenarse el tablero (sin reintentos)
- Soporte táctil / móvil
- Admin panel para gestionar la tabla `games`
- Assets externos (sonidos, sprites)
- Tema claro/oscuro del `game.js` original — fuera de scope

---

## Data model

```ts
type GameState = { score: number; lines: number; level: number }
// condición game-over: spawn() colisiona inmediatamente al colocar nueva pieza
```

Fila en Supabase:
```sql
INSERT INTO games (slug, name, description, image_url, route)
VALUES ('tetris', 'Tetris',
        'El clásico puzzle de bloques que caen. Encaja tetrominos, completa líneas y sube de nivel antes de que el tablero se llene.',
        '/games/tetris.png',
        '/games/tetris');
```

Constantes del motor (no cambian en runtime):
- `COLS = 10`, `ROWS = 20`, `BLOCK = 30` → tablero 300×600 px
- `LINE_SCORES = [0, 100, 300, 500, 800]` × level
- Hard drop: +2 pt/celda · Soft drop: +1 pt/fila
- `dropInterval = max(100, 1000 − (level − 1) × 90)` ms

localStorage:
- Clave: `arcade_player_name` (compartida con Asteroids)

---

## Implementation plan

1. **`app/games/tetris/game.ts`** — módulo puro (sin imports React/Next/Supabase)
   - Firma exportada:
     ```ts
     export function startGame(
       canvas: HTMLCanvasElement,
       nextCanvas: HTMLCanvasElement,
       onStateChange?: (state: { score: number; lines: number; level: number }) => void
     ): { cleanup: () => void; setPaused: (p: boolean) => void }
     ```
   - Transformaciones respecto al `game.js` de referencia:
     - Eliminar todo el wiring DOM (`document.getElementById`, `overlay`,
       `restartBtn`, `themeToggle`, `scoreEl`, `linesEl`, `levelEl`)
     - `ctx` y `nextCtx` se obtienen de los canvas recibidos como parámetros
     - `endGame()` solo cancela el RAF y llama `onStateChange` con el estado final;
       no muestra overlay (lo reemplaza el modal React)
     - `notifyState()` con guard de valores previos — solo llama `onStateChange`
       cuando score/lines/level cambian (evita 60 re-renders/seg)
     - `isPaused` + `lastTime = null` al pausar; en el loop:
       `if (!lastTime) { lastTime = ts; return; }` (evita spike de dt al reanudar)
     - Event listeners en `window` (no `document`); `cleanup()` los remueve
     - `KeyP` eliminado — la pausa la controla React vía `setPaused`

2. **`app/games/tetris/TetrisGame.tsx`** — componente `'use client'`
   - `useRef` para `canvasRef`, `nextCanvasRef`, `setPausedRef`, `scoreSaved`
   - `useState` para `score`, `lines`, `level`, `paused`, `playerName`, `gameStarted`
   - `useEffect` inicial: pre-rellena `playerName` desde `localStorage`
   - `useEffect` condicional: corre solo cuando `gameStarted === true`;
     llama `startGame(canvasRef.current, nextCanvasRef.current, callback)`;
     en el callback, cuando score/lines/level cambian → actualiza state;
     cuando es game-over → `saveScore()`
   - `saveScore()`: inserta en `scores` vía `createClient()` con guard
     `scoreSaved.current` (evita doble insert game-over + SALIR)
   - `handleExit()`: llama `saveScore(score)` antes de `router.push('/')`
   - Estructura visual (patrón Asteroids):
     ```
     .av-player.fade-in
       .player-hud
         .hud-stat  (jugador / ink)
         .hud-stat  (puntuación / cyan)
         .hud-stat  (líneas / cyan)
         .hud-stat.level  (nivel / yellow)
         .hud-actions
           <button .btn.yellow>  PAUSA / REANUDAR
           <button .btn.ghost>   SALIR → /
       .crt
         .crt-screen
           modal nombre (overlay, visible cuando !gameStarted)
           <canvas ref=canvasRef width=300 height=600>
           overlay pausa (visible cuando paused)
         .crt-bottom  (LED verde + info técnica)
       panel preview
         <canvas ref=nextCanvasRef width=120 height=120>
         etiqueta "SIGUIENTE"
     ```

3. **`app/games/tetris/page.tsx`** — Server Component
   ```tsx
   import TetrisGame from './TetrisGame'
   export default function Page() { return <TetrisGame /> }
   ```

4. **INSERT en tabla `games`** — ejecutar vía Supabase MCP (`execute_sql`):
   ```sql
   INSERT INTO games (slug, name, description, image_url, route)
   VALUES ('tetris', 'Tetris',
           'El clásico puzzle de bloques que caen. Encaja tetrominos, completa líneas y sube de nivel antes de que el tablero se llene.',
           '/games/tetris.png', '/games/tetris');
   ```
   Verificar que `/biblioteca` muestra la tarjeta de Tetris.

5. **Verificación final**
   - `npx tsc --noEmit` pasa sin errores
   - `/games/tetris` carga el juego sin errores de consola
   - Modal de nombre aparece antes del canvas; pre-rellena desde localStorage
   - HUD externo muestra jugador/puntuación/líneas/nivel actualizados en tiempo real
   - PAUSA congela el loop; REANUDAR lo retoma sin spike de dt
   - Score se inserta una sola vez en `scores` al game-over y al pulsar SALIR

---

## Acceptance criteria

- [ ] `app/games/tetris/game.ts` existe y exporta únicamente `startGame`
- [ ] `startGame` no importa React, Next.js ni Supabase
- [ ] `startGame` recibe `HTMLCanvasElement` (tablero) + `HTMLCanvasElement` (preview) + callback opcional
- [ ] `startGame` devuelve `{ cleanup, setPaused }`
- [ ] `cleanup` cancela el `requestAnimationFrame` loop y remueve los event listeners de `window`
- [ ] `notifyState()` solo llama `onStateChange` cuando score/lines/level cambian respecto al frame anterior
- [ ] `lastTime = null` al pausar; el loop lo detecta y restablece sin spike de dt
- [ ] Modal de nombre aparece antes del canvas; el juego no arranca hasta confirmar
- [ ] El input del modal se pre-rellena con `localStorage.getItem('arcade_player_name')` si existe
- [ ] Al confirmar el nombre se guarda en localStorage con clave `arcade_player_name`
- [ ] HUD externo muestra jugador, puntuación, líneas y nivel actualizados en tiempo real
- [ ] Canvas de preview (120×120) muestra la siguiente pieza correctamente
- [ ] Botón PAUSA congela el loop; REANUDAR lo retoma
- [ ] Botón SALIR guarda el score (si > 0 y no guardado) y navega a `/`
- [ ] Score se inserta una sola vez en `scores` al game-over (`scoreSaved` ref)
- [ ] `scores.game_slug` es exactamente `'tetris'`
- [ ] Fila en `games` existe con slug `tetris` e `image_url '/games/tetris.png'`
- [ ] `/biblioteca` muestra la tarjeta de Tetris con nombre, descripción e imagen
- [ ] `/games/tetris` es la ruta — no `/games` ni `/tetris`
- [ ] `npx tsc --noEmit` pasa sin errores
- [ ] Las rutas existentes de la plataforma no se ven afectadas

---

## Decisions

- **`game.ts` sin imports externos** — portabilidad y testabilidad: el módulo
  puede ejecutarse en cualquier entorno que tenga un `HTMLCanvasElement`, sin
  depender del runtime de React, Next.js ni Supabase.

- **`startGame` recibe dos canvas (tablero + preview)** — el canvas de preview
  era un segundo elemento DOM en el original; pasarlo como parámetro mantiene
  el módulo puro y deja que React controle ambos refs.

- **`notifyState()` con guard de valores previos** — el loop corre a 60 fps;
  llamar `onStateChange` cada frame causaría 60 re-renders/seg. El guard compara
  con los valores del frame anterior y solo notifica cuando algo cambia.

- **`lastTime = null` en rama paused** — evita que al reanudar el `dt` acumule
  todo el tiempo pausado y cause un salto de física (pieza cayendo múltiples
  filas de golpe).

- **`scoreSaved` ref en lugar de estado** — game-over y SALIR pueden ocurrir en
  secuencia rápida; una ref evita dos inserciones sin necesidad de estado
  adicional ni re-render.

- **`game_slug: 'tetris'`** — coincide exactamente con el `slug` de la tabla
  `games` (requisito de la FK `scores.game_slug → games.slug`).

- **Sin mecánica de vidas** — Tetris termina al llenarse el tablero; añadir
  vidas cambiaría la mecánica canónica del juego sin beneficio claro.

- **HUD campo "Líneas" en lugar de "Vidas"** — `lines` es la métrica
  significativa de Tetris (afecta nivel y velocidad). "Vidas" no aplica al
  juego.

- **Tema claro/oscuro del `game.js` original fuera de scope** — el toggle de
  tema usaba `localStorage('tetris-theme')` y CSS variables propias; la
  plataforma tiene su propio sistema de tema global. Integrarlo requiere un
  spec separado.

- **`KeyP` eliminado del `game.ts`** — la pausa la controla React vía botón
  del HUD y `setPaused`. Tener dos rutas de pausa (tecla + botón) puede
  desincronizar el estado `paused` de React con el del loop.
