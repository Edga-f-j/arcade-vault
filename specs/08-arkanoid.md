# SPEC 08 — Juego: Arkanoid

> **Status:** aprobado · **Depends on:** 06-leaderboard-catalogo-scores · **Date:** 2026-06-17
> **Objective:** Integrar Arkanoid (Canvas/JS vanilla) en la plataforma como página
> pública `/games/arkanoid`, con `game.ts` encapsulado, HUD externo React
> (jugador/puntuación/vidas/nivel), sprites y sonidos del spritesheet original,
> y guardado de score en Supabase al game-over o al completar el juego.

---

## Scope

**In:**

- `app/games/arkanoid/spritesheet.ts` — `spritesheet.js` convertido a módulo ES TypeScript:
  expone `loadSpritesheet(cb)`, `drawSprite`, `drawFrame`, `SPRITES`, `EXPLOSION_FRAMES`,
  `EXPLOSION_DURATION`; ruta del asset: `/games/arkanoid/spritesheet-breakout.png`
- `app/games/arkanoid/game.ts` — `game.js` convertido a módulo ES puro (sin imports
  React/Next/Supabase); importa `./spritesheet`; exporta
  `startGame(canvas, onStateChange?)` → `{ cleanup, setPaused }`
- `app/games/arkanoid/ArkanoidGame.tsx` — componente `'use client'` con HUD externo
  (jugador, puntuación, vidas, nivel) + canvas 800×600 envuelto en `.crt` / `.crt-screen`
- `app/games/arkanoid/page.tsx` — Server Component que renderiza `<ArkanoidGame />`
- Controles: `ArrowLeft`/`ArrowRight` (teclado) + `mousemove` (ratón mueve la paleta)
- Modal de nombre antes de iniciar (input + localStorage `arcade_player_name`)
- Botón PAUSA (congela el loop) y SALIR (vuelve a `/`)
- Guardado de score en Supabase al perder o al ganar (`scoreSaved` ref, una sola vez)
- Assets copiados a `public/games/arkanoid/`: `spritesheet-breakout.png`,
  `sounds/ball-bounce.mp3`, `sounds/break-sound.mp3`
- INSERT en tabla `games` con slug `arkanoid` e `image_url null`

**Out of scope (para specs futuros):**

- Canvas responsivo — tamaño fijo 800×600
- Autenticación — el jugador se identifica solo por nombre en localStorage
- `image_url` de la tarjeta — se añade en un spec posterior
- Soporte táctil / móvil
- Admin panel para gestionar la tabla `games`
- Overlay "GAME OVER" / "¡Completaste el juego!" en canvas — lo reemplaza modal React
- Overlay de pausa en canvas — lo reemplaza React
- Botones "saltar de nivel" del overlay de pausa original
- Assets de sonido o sprites adicionales más allá de los incluidos en el spritesheet original

---

## Data model

```ts
type GameState = {
  score: number
  lives: number
  level: number
  status: 'playing' | 'gameover' | 'win'
}
// condición game-over: lives <= 0 (pelota cae por debajo del canvas) → status: 'gameover'
// condición victoria: se completan los 5 niveles → status: 'win'
```

Fila en Supabase:
```sql
INSERT INTO games (slug, name, description, image_url, route)
VALUES ('arkanoid', 'Arkanoid',
        'El clásico arcade de paleta y pelota. Rompe todos los bloques de cada nivel sin dejar caer la pelota. ¿Puedes completar los 5 niveles?',
        null,
        '/games/arkanoid');
```

Constantes del motor (no cambian en runtime):
- Canvas: 800×600 px
- Paleta: 81×14 px (sprite `paddle`), velocidad 400 px/s
- Pelota: 16×16 px (sprite `ball`)
- Bloques: 64×24 px, 10 columnas × 6 filas por nivel
- 5 niveles definidos en `levels.ts`; cada uno tiene `blocks[]` y `speed`
- Vidas iniciales: 3

localStorage:
- Clave: `arcade_player_name` (compartida con Asteroids y Tetris)

---

## Implementation plan

1. **Copiar assets a `public/games/arkanoid/`**
   - `spritesheet-breakout.png` desde `references/templates/started-games/04-arkanoid/assets/`
   - `sounds/ball-bounce.mp3` y `sounds/break-sound.mp3` desde el mismo origen
   - Verificar que las rutas `/games/arkanoid/spritesheet-breakout.png` y
     `/games/arkanoid/sounds/*.mp3` responden con 200

2. **`app/games/arkanoid/spritesheet.ts`** — conversión de `spritesheet.js` a TypeScript
   - Tipar `SPRITES`, `EXPLOSION_FRAMES`, `EXPLOSION_DURATION`
   - Cambiar `rawImg.src` de `'assets/spritesheet-breakout.png'` a
     `'/games/arkanoid/spritesheet-breakout.png'`
   - Exportar: `loadSpritesheet`, `drawSprite`, `drawFrame`, `SPRITES`,
     `EXPLOSION_FRAMES`, `EXPLOSION_DURATION`
   - Sin imports externos

3. **`app/games/arkanoid/levels.ts`** — conversión de `levels.js` a TypeScript
   - Tipar `LEVELS`: `Array<{ blocks: { row: number; col: number; color: string }[]; speed: number }>`
   - Exportar `LEVELS`

4. **`app/games/arkanoid/game.ts`** — módulo puro (sin imports React/Next/Supabase)
   - Firma exportada:
     ```ts
     export function startGame(
       canvas: HTMLCanvasElement,
       onStateChange?: (state: {
         score: number
         lives: number
         level: number
         status: 'playing' | 'gameover' | 'win'
       }) => void
     ): { cleanup: () => void; setPaused: (p: boolean) => void }
     ```
   - El loop no empieza a dibujar el spritesheet hasta que el callback de
     `loadSpritesheet` confirme que la imagen terminó de cargar
   - Transformaciones respecto al `game.js` de referencia:
     - Eliminar `document.getElementById('game')` — canvas llega como parámetro
     - Importar `loadSpritesheet`, `drawSprite`, `drawFrame`, `EXPLOSION_FRAMES`,
       `EXPLOSION_DURATION` desde `./spritesheet`
     - Importar `LEVELS` desde `./levels`
     - Eliminar `drawOverlay('GAME OVER')` y `drawOverlay('¡Completaste el juego!')`
       del `draw()` — los reemplaza el modal React
     - Eliminar `drawPauseOverlay()` del `draw()` — lo reemplaza React
     - Eliminar el event listener `canvas.addEventListener('click', ...)` de
       los botones de nivel del overlay de pausa
     - `notifyState()` con guard de valores previos — solo llama `onStateChange`
       cuando score/lives/level/status cambian (evita 60 re-renders/seg)
     - `isPaused` controlado exclusivamente por `setPaused` (React);
       eliminar el handler de `P`/`Escape` del keydown
     - `lastTime = null` al pausar; en el loop:
       `if (!lastTime) { lastTime = ts; return; }` (evita spike de dt al reanudar)
     - Event listeners: `keydown`/`keyup` en `document`, `mousemove` en `canvas`;
       `cleanup()` los remueve todos
     - El motor mantiene internamente `gameState: 'playing' | 'gameover' | 'win'`;
       cuando `lives <= 0` lo cambia a `'gameover'`, y cuando se completa el
       nivel 5 lo cambia a `'win'`. En ambos casos, `onStateChange` recibe el
       payload final con el `status` correspondiente y el loop cancela el RAF

5. **`app/games/arkanoid/ArkanoidGame.tsx`** — componente `'use client'`
   - `useRef` para `canvasRef`, `setPausedRef`, `scoreSaved`
   - `useState` para `score`, `lives`, `level`, `paused`, `playerName`,
     `gameStarted`, `gameOver`, `gameWon`
   - `useEffect` inicial: pre-rellena `playerName` desde `localStorage`
   - `useEffect` condicional: corre solo cuando `gameStarted === true`;
     llama `startGame(canvasRef.current, callback)`;
     en el callback actualiza score/lives/level; cuando `status === 'gameover'`
     → activa `gameOver` y llama `saveScore()`; cuando `status === 'win'`
     → activa `gameWon` y llama `saveScore()`
   - `saveScore()`: inserta en `scores` vía `createClient()` con guard
     `scoreSaved.current`
   - `handleExit()`: llama `saveScore(score)` antes de `router.push('/')`
   - Estructura visual (patrón Asteroids/Tetris):
     ```
     .av-player.fade-in
       .player-hud
         .hud-stat  (jugador / ink)
         .hud-stat  (puntuación / cyan)
         .hud-stat  (vidas / cyan)
         .hud-stat.level  (nivel / yellow)
         .hud-actions
           <button .btn.yellow>  PAUSA / REANUDAR
           <button .btn.ghost>   SALIR → /
       .crt
         .crt-screen
           modal nombre (overlay, visible cuando !gameStarted)
           modal game-over (overlay, visible cuando gameOver)
           modal victoria (overlay, visible cuando gameWon)
           overlay pausa (visible cuando paused)
           <canvas ref=canvasRef width=800 height=600>
         .crt-bottom  (LED verde + info técnica)
     ```

6. **`app/games/arkanoid/page.tsx`** — Server Component
   ```tsx
   import ArkanoidGame from './ArkanoidGame'
   export default function Page() { return <ArkanoidGame /> }
   ```

7. **INSERT en tabla `games`** — ejecutar vía Supabase MCP (`execute_sql`):
   ```sql
   INSERT INTO games (slug, name, description, image_url, route)
   VALUES ('arkanoid', 'Arkanoid',
           'El clásico arcade de paleta y pelota. Rompe todos los bloques de cada nivel sin dejar caer la pelota. ¿Puedes completar los 5 niveles?',
           null, '/games/arkanoid');
   ```
   Verificar que `/biblioteca` muestra la tarjeta de Arkanoid.

8. **Verificación final**
   - `npx tsc --noEmit` pasa sin errores
   - `/games/arkanoid` carga el juego sin errores de consola
   - Sprites y sonidos se cargan correctamente desde `/public/games/arkanoid/`
   - Modal de nombre aparece antes del canvas; pre-rellena desde localStorage
   - HUD externo muestra jugador/puntuación/vidas/nivel actualizados en tiempo real
   - PAUSA congela el loop; REANUDAR lo retoma sin spike de dt
   - Score se inserta una sola vez en `scores` tanto al perder como al ganar

---

## Acceptance criteria

- [ ] `app/games/arkanoid/spritesheet.ts` exporta `loadSpritesheet`, `drawSprite`,
      `drawFrame`, `SPRITES`, `EXPLOSION_FRAMES`, `EXPLOSION_DURATION` sin imports externos
- [ ] `app/games/arkanoid/levels.ts` exporta `LEVELS` tipado
- [ ] `app/games/arkanoid/game.ts` existe y exporta únicamente `startGame`
- [ ] `startGame` no importa React, Next.js ni Supabase
- [ ] `startGame` devuelve `{ cleanup, setPaused }`
- [ ] `cleanup` cancela el `requestAnimationFrame` loop y remueve todos los event listeners
- [ ] `onStateChange` entrega `{ score, lives, level, status }`, con `status` igual a
      `'gameover'` cuando `lives <= 0` y `'win'` cuando se completan los 5 niveles
- [ ] `notifyState()` solo llama `onStateChange` cuando score/lives/level/status cambian
      respecto al frame anterior
- [ ] `lastTime = null` al pausar; el loop lo detecta y restablece sin spike de dt
- [ ] El canvas no dibuja sprites hasta que `loadSpritesheet` confirme que la imagen cargó
- [ ] Sprites (paleta, pelota, bloques, explosiones) se renderizan desde el spritesheet
- [ ] Sonidos `ball-bounce.mp3` y `break-sound.mp3` se reproducen en los eventos correctos
- [ ] Modal de nombre aparece antes del canvas; el juego no arranca hasta confirmar
- [ ] El input del modal se pre-rellena con `localStorage.getItem('arcade_player_name')`
      si existe
- [ ] Al confirmar el nombre se guarda en localStorage con clave `arcade_player_name`
- [ ] HUD externo muestra jugador, puntuación, vidas y nivel actualizados en tiempo real
- [ ] Controles de teclado (`ArrowLeft`/`ArrowRight`) y ratón (`mousemove`) funcionan
      simultáneamente
- [ ] Botón PAUSA congela el loop; REANUDAR lo retoma
- [ ] Botón SALIR guarda el score (si > 0 y no guardado) y navega a `/`
- [ ] Modal de game-over aparece cuando `status === 'gameover'`
- [ ] Modal de victoria aparece cuando `status === 'win'`
- [ ] Score se inserta una sola vez en `scores` tanto al perder (`status === 'gameover'`)
      como al ganar (`status === 'win'`) (`scoreSaved` ref)
- [ ] `scores.game_slug` es exactamente `'arkanoid'`
- [ ] Fila en `games` existe con slug `arkanoid` e `image_url null`
- [ ] `/biblioteca` muestra la tarjeta de Arkanoid con nombre y descripción
- [ ] `/games/arkanoid` es la ruta — no `/games` ni `/arkanoid`
- [ ] `npx tsc --noEmit` pasa sin errores
- [ ] Las rutas existentes de la plataforma no se ven afectadas

---

## Decisions

- **`game.ts` sin imports externos (salvo `./spritesheet` y `./levels`)** — portabilidad
  y testabilidad: el módulo puede ejecutarse en cualquier entorno que tenga un
  `HTMLCanvasElement`, sin depender del runtime de React, Next.js ni Supabase.

- **`spritesheet.ts` como módulo separado** — mantiene `game.ts` enfocado en lógica
  de juego; permite reusar o sustituir el sistema de sprites sin tocar el motor.

- **Assets en `/public/games/arkanoid/`** — Next.js sirve `/public` como raíz estática;
  esta subcarpeta agrupa todos los assets del juego y evita colisiones con otros juegos.

- **`onStateChange` incluye campo `status`** — sin este campo, React no tiene forma de
  distinguir si la partida terminó por derrota o por victoria; `lives` y `level` por
  sí solos son ambiguos en el momento del final de partida. `status: 'playing' |
  'gameover' | 'win'` hace explícito cuál modal mostrar, sin depender de inferencias.

- **`notifyState()` con guard de valores previos** — el loop corre a 60 fps; llamar
  `onStateChange` cada frame causaría 60 re-renders/seg. El guard compara con los
  valores del frame anterior y solo notifica cuando algo cambia.

- **`lastTime = null` en rama paused** — evita que al reanudar el `dt` acumule todo
  el tiempo pausado y cause un salto de física (pelota teletransportada).

- **`scoreSaved` ref en lugar de estado** — game-over y SALIR pueden ocurrir en
  secuencia rápida; una ref evita dos inserciones sin necesidad de estado adicional
  ni re-render.

- **`game_slug: 'arkanoid'`** — coincide exactamente con el `slug` de la tabla `games`
  (requisito de la FK `scores.game_slug → games.slug`).

- **`P`/`Escape` eliminados del `game.ts`** — la pausa la controla React vía botón
  del HUD y `setPaused`. Tener dos rutas de pausa desincronizaría el estado `paused`
  de React con el del loop.

- **Overlay de pausa y game-over eliminados del canvas** — los reemplaza React;
  el HUD interno del canvas (score, nivel, vidas como sprites) se conserva como
  doble HUD, igual que en Asteroids y Tetris.

- **`image_url null`** — no hay portada disponible en este spec; se añade en un
  spec posterior sin bloquear la integración del juego.

- **Botones "saltar de nivel" del overlay de pausa fuera de scope** — la pausa
  la maneja React con un overlay simple; los botones de nivel del canvas original
  quedan descartados para mantener consistencia con el patrón de la plataforma.
