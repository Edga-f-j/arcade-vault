# SPEC 09 — Juego: Snake

> **Status:** Aprobado · **Depends on:** 06-leaderboard-catalogo-scores · **Date:** 2026-06-17
> **Objective:** Integrar Snake (Canvas diseñado desde cero) en la plataforma como página
> pública `/games/snake`, con `game.ts` encapsulado, HUD externo React
> (jugador/puntuación/vidas/nivel), sprites de frutas del atlas oficial,
> y guardado de score en Supabase al game-over o al pulsar SALIR.

---

## Scope

**In:**

- `app/games/snake/game.ts` — módulo ES puro (sin imports React/Next/Supabase);
  exporta `startGame(canvas, onStateChange?, onPauseToggle?)` → `{ cleanup, setPaused }`
- `app/games/snake/SnakeGame.tsx` — componente `'use client'` con HUD externo
  (jugador, puntuación, vidas, nivel) + canvas 600×600 envuelto en `.crt` / `.crt-screen`
- `app/games/snake/page.tsx` — Server Component que renderiza `<SnakeGame />`
- Controles: `ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight` y `W`/`A`/`S`/`D` (teclado)
- Tecla `P` para pausar/reanudar (sincronizada con React vía `onPauseToggle`)
- Modal de nombre antes de iniciar (input + localStorage `arcade_player_name`)
- Botón PAUSA (congela el loop) y SALIR (guarda score si > 0 y vuelve a `/`)
- 3 vidas: cada colisión descuenta una vida y reinicia la serpiente; `lives === 0` → game-over
- Frutas con sprites del atlas `fruits.png` (22 tipos); cada fruta se dibuja con una
  rotación aleatoria elegida entre 0°/90°/180°/270° en el momento en que aparece
- Guardado de score en Supabase al game-over o al pulsar SALIR (`scoreSaved` ref, una sola vez)
- Assets copiados a `public/games/snake/`: `fruits.png`
- INSERT en tabla `games` con slug `snake` e `image_url null`

**Out of scope (para specs futuros):**

- Canvas responsivo — tamaño fijo 600×600 px
- Autenticación — el jugador se identifica solo por nombre en localStorage
- `image_url` de la tarjeta — se añade en un spec posterior
- Soporte táctil / móvil
- Admin panel para gestionar la tabla `games`
- Overlay "GAME OVER" en canvas — lo reemplaza modal React
- Overlay de pausa en canvas — lo reemplaza React
- Sprites para el cuerpo de la serpiente — se dibuja con rectángulos de color
- Sonidos

---

## Data model

```ts
type GameState = { score: number; lives: number; level: number }
// condición game-over: lives === 0 (serpiente choca con pared o consigo misma, agota las 3 vidas)
```

Constantes del motor (no cambian en runtime):

- Canvas: 600×600 px
- Grid: 20×20 celdas de 30 px
- Serpiente inicial: posición (10, 10), longitud 3, dirección `RIGHT`
- Vidas iniciales: 3
- Velocidad inicial: 150 ms/tick; se reduce 10 ms por nivel (mínimo 60 ms)
- Nivel: sube cada 5 frutas comidas
- Score por fruta: `10 × level`
- Frutas: 22 tipos del atlas `fruits.png`; se elige uno al azar al generar cada fruta;
  siempre se dibuja a 28×28 px centrado en la celda de 30 px; rotación elegida al azar
  entre 0°/90°/180°/270° en el momento en que se genera (se conserva fija mientras esa
  fruta está en el tablero, no rota mientras espera a ser comida)

Fila en Supabase:
```sql
INSERT INTO games (slug, name, description, image_url, route)
VALUES ('snake', 'Snake',
        'El clásico juego de la serpiente. Come frutas para crecer y subir de nivel — pero no choques con las paredes ni contigo mismo.',
        null,
        '/games/snake');
```

localStorage:
- Clave: `arcade_player_name` (compartida con Asteroids, Tetris y Arkanoid)

---

## Implementation plan

1. **Copiar assets a `public/games/snake/`**
   - `fruits.png` desde `references/source-assets/snake-assets/`
   - Verificar que `/games/snake/fruits.png` responde con 200

2. **`app/games/snake/game.ts`** — módulo puro (sin imports React/Next/Supabase)
   - Firma exportada:
     ```ts
     export function startGame(
       canvas: HTMLCanvasElement,
       onStateChange?: (state: { score: number; lives: number; level: number }) => void,
       onPauseToggle?: (paused: boolean) => void
     ): { cleanup: () => void; setPaused: (p: boolean) => void }
     ```
   - Estado interno encapsulado: `snake: {x,y}[]`, `dir`, `nextDir`,
     `fruit: {x,y,type,rotation}`, `score`, `lives`, `level`, `fruitsEaten`,
     `isPaused`, `gameOver`, `lastTime`, `tickAccumulator`, `fruitImg: HTMLImageElement`
   - Atlas de frutas: cargar `fruitImg` con `src = '/games/snake/fruits.png'`;
     las coordenadas de recorte vienen de un mapa interno idéntico al de `sprites.js`
     (copiado como constante en el módulo, sin import de ese archivo)
   - Función interna `spawnFruit()`: elige un tipo al azar entre los 22, una rotación
     al azar entre 0°/90°/180°/270°, y una celda aleatoria del grid 20×20 **excluyendo
     todas las celdas actualmente ocupadas por el cuerpo de la serpiente**
   - `tick()`: avanza la serpiente, detecta colisión con paredes y consigo misma,
     consume fruta (llama `spawnFruit()` para la siguiente), actualiza score/level/lives;
     si colisión:
     - si `lives > 1`: decrementa `lives`, reinicia posición/dirección de la serpiente,
       reinicia `tickAccumulator = 0` (evita un tick inmediato indeseado justo después
       del respawn), llama `notifyState()`
     - si `lives === 1` (última vida): decrementa a 0, marca `gameOver = true`,
       remueve los event listeners de teclado (el mismo procedimiento interno que usa
       `cleanup()`), llama `notifyState()` con `lives: 0` y cancela el RAF
   - `draw()`: dibuja fondo del grid, cuerpo de la serpiente (rectángulos `#4ade80`),
     cabeza (rectángulo `#22c55e` ligeramente diferente), fruta con `drawImage` del
     atlas aplicando la rotación guardada en `fruit.rotation` vía
     `ctx.translate`/`ctx.rotate` antes de dibujar
   - Game loop (`loop(ts)`):
     ```ts
     if (isPaused) { lastTime = null; rafId = requestAnimationFrame(loop); return }
     if (!lastTime) { lastTime = ts; rafId = requestAnimationFrame(loop); return }
     tickAccumulator += ts - lastTime
     lastTime = ts
     while (tickAccumulator >= tickInterval) { tick(); tickAccumulator -= tickInterval }
     draw()
     if (!gameOver) rafId = requestAnimationFrame(loop)
     ```
   - `notifyState()` con guard: solo llama `onStateChange` cuando score/lives/level
     cambian respecto al frame anterior (evita 60 re-renders/seg)
   - `setPaused(p)`: asigna `isPaused = p`; `lastTime = null` al pausar. Esta es una
     **asignación absoluta** (no un toggle) — recibe el valor final deseado, no invierte
     el estado actual. Es la única función con este nombre en todo el módulo.
   - Tecla `P`: el handler interno del `keydown` calcula `next = !isPaused`, llama a su
     propio `setPaused(next)` para aplicar el cambio internamente, y luego llama
     `onPauseToggle?.(next)` para que React se entere del nuevo valor. El motor nunca
     espera ni necesita que React le confirme nada de vuelta para este camino.
   - Controles `keydown` en `document`: flechas y WASD actualizan `nextDir`
     (no se permite dirección opuesta a la actual); `P` activa pausa
   - `cleanup()`: cancela el RAF y remueve todos los event listeners de `document`

3. **`app/games/snake/SnakeGame.tsx`** — componente `'use client'`
   - `useRef` para `canvasRef`, `setPausedRef` (guarda el `setPaused` que devuelve
     `startGame`, distinto del `setPaused` de `useState` de abajo), `scoreSaved`
   - `useState` para `score`, `lives`, `level`, `paused`, `playerName`,
     `gameStarted`, `gameOver`
   - `useEffect` inicial: pre-rellena `playerName` desde `localStorage`
   - `useEffect` condicional: corre solo cuando `gameStarted === true`;
     llama `startGame(canvasRef.current, callback, onPauseToggle)` y guarda
     el `setPaused` devuelto en `setPausedRef.current`;
     en el callback actualiza score/lives/level; cuando `lives === 0`
     → activa `gameOver` y llama `saveScore()`
   - **`onPauseToggle(p)`**: actualiza **únicamente** el estado local de React con
     el setter de `useState` (`setPaused(p)`) para que la UI (etiqueta del botón,
     overlay de pausa) refleje el cambio. **Nunca llama `setPausedRef.current(p)`
     aquí** — el motor ya aplicó el cambio internamente al procesar la tecla `P`;
     volver a empujarlo desde React sería redundante, y dejaría la puerta abierta
     a una doble inversión si en el futuro el `setPaused` del motor dejara de ser
     una asignación absoluta.
   - **Botón PAUSA (clic)**: este es el camino inverso — actualiza el estado local
     `setPaused(!paused)` **y además** llama `setPausedRef.current(!paused)` para
     empujar el cambio hacia el motor, ya que en este caso React es quien origina
     la acción.
   - `saveScore()`: inserta en `scores` vía `createClient()` con guard `scoreSaved.current`
   - `handleExit()`: llama `saveScore(score)` antes de `router.push('/')`
   - Estructura visual (patrón Asteroids/Tetris/Arkanoid):
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
           overlay pausa (visible cuando paused)
           <canvas ref=canvasRef width=600 height=600>
         .crt-bottom  (LED verde + info técnica)
     ```

4. **`app/games/snake/page.tsx`** — Server Component
   ```tsx
   import SnakeGame from './SnakeGame'
   export default function Page() { return <SnakeGame /> }
   ```

5. **INSERT en tabla `games`** — ejecutar vía Supabase MCP (`execute_sql`):
   ```sql
   INSERT INTO games (slug, name, description, image_url, route)
   VALUES ('snake', 'Snake',
           'El clásico juego de la serpiente. Come frutas para crecer y subir de nivel — pero no choques con las paredes ni contigo mismo.',
           null, '/games/snake');
   ```
   Verificar que `/biblioteca` muestra la tarjeta de Snake.

6. **Verificación final**
   - `npx tsc --noEmit` pasa sin errores
   - `/games/snake` carga el juego sin errores de consola
   - Sprites de frutas se cargan correctamente desde `/public/games/snake/fruits.png`,
     con rotación aleatoria visible entre frutas distintas
   - Modal de nombre aparece antes del canvas; pre-rellena desde localStorage
   - HUD externo muestra jugador/puntuación/vidas/nivel actualizados en tiempo real
   - PAUSA (botón y tecla `P`) congela el loop; REANUDAR lo retoma sin spike de dt
   - Pausar y reanudar repetidamente alternando botón y tecla `P` nunca desincroniza
     el `paused` de React respecto al `isPaused` del motor
   - Score se inserta una sola vez en `scores` al game-over y al pulsar SALIR

---

## Acceptance criteria

- [ ] `app/games/snake/game.ts` existe y exporta únicamente `startGame`
- [ ] `startGame` no importa React, Next.js ni Supabase
- [ ] `startGame` devuelve `{ cleanup, setPaused }`
- [ ] `cleanup` cancela el `requestAnimationFrame` loop y remueve todos los event listeners de `document`
- [ ] `onStateChange` entrega `{ score, lives, level }` solo cuando alguno de esos valores cambia
- [ ] `onPauseToggle` se llama cuando el usuario presiona `P`, con el nuevo valor `paused`
- [ ] El callback `onPauseToggle` en React actualiza únicamente el estado local (`useState`)
      y nunca vuelve a llamar `setPausedRef.current()`
- [ ] El botón PAUSA de React y la tecla `P` producen el mismo resultado (mismo `isPaused` en el motor, mismo `paused` en React), incluso alternándolos varias veces en secuencia
- [ ] `lastTime = null` al pausar; el loop lo detecta y restablece sin spike de dt
- [ ] `tickAccumulator = 0` al perder una vida (no game-over), evitando un tick inmediato tras el respawn
- [ ] La serpiente no puede girar 180° (dirección opuesta bloqueada)
- [ ] Cada colisión descuenta una vida y reinicia la serpiente en posición inicial
- [ ] `lives === 0` cancela el loop, remueve los event listeners de teclado y llama `onStateChange` con `lives: 0`
- [ ] Fruta aparece en posición aleatoria fuera del cuerpo de la serpiente
- [ ] Fruta se dibuja con sprite del atlas `fruits.png`; tipo elegido al azar entre los 22
- [ ] Cada fruta se dibuja con una rotación aleatoria (0°/90°/180°/270°) elegida al aparecer y fija mientras espera ser comida
- [ ] Score incrementa `10 × level` por fruta comida
- [ ] Nivel sube cada 5 frutas; velocidad del tick disminuye 10 ms por nivel (mínimo 60 ms)
- [ ] Modal de nombre aparece antes del canvas; el juego no arranca hasta confirmar
- [ ] El input del modal se pre-rellena con `localStorage.getItem('arcade_player_name')` si existe
- [ ] Al confirmar el nombre se guarda en localStorage con clave `arcade_player_name`
- [ ] HUD externo muestra jugador, puntuación, vidas y nivel actualizados en tiempo real
- [ ] Botón PAUSA congela el loop; REANUDAR lo retoma
- [ ] Botón SALIR guarda el score (si > 0 y no guardado) y navega a `/`
- [ ] Modal de game-over aparece cuando `lives === 0`
- [ ] Score se inserta una sola vez en `scores` al game-over y al pulsar SALIR (`scoreSaved` ref)
- [ ] `scores.game_slug` es exactamente `'snake'`
- [ ] Fila en `games` existe con slug `snake` e `image_url null`
- [ ] `/biblioteca` muestra la tarjeta de Snake con nombre y descripción
- [ ] `/games/snake` es la ruta — no `/games` ni `/snake`
- [ ] `npx tsc --noEmit` pasa sin errores
- [ ] Las rutas existentes de la plataforma no se ven afectadas

---

## Decisions

- **`game.ts` sin imports externos** — portabilidad y testabilidad: el módulo puede
  ejecutarse en cualquier entorno que tenga un `HTMLCanvasElement`, sin depender del
  runtime de React, Next.js ni Supabase.

- **Mapa del atlas copiado como constante en `game.ts`** — `sprites.js` usa
  `window.SPRITE_ATLAS` (global de browser); copiarlo como constante TS mantiene
  el módulo puro y evita dependencia de un archivo de configuración externo.

- **`onPauseToggle` como tercer parámetro de `startGame`** — permite que la tecla `P`
  funcione sin desincronizar el estado `paused` de React con el `isPaused` del motor.
  El botón del HUD llama `setPaused` directamente; la tecla `P` llama `setPaused`
  internamente y notifica a React vía `onPauseToggle`. Ambas rutas convergen en el
  mismo flag `isPaused`.

- **`onPauseToggle` en React solo actualiza estado local, nunca el motor** — cuando
  `P` dispara el cambio, el motor ya actualizó su propio `isPaused`; el callback hacia
  React existe únicamente para mantener la UI sincronizada (etiqueta del botón, overlay).
  Volver a llamar `setPausedRef.current()` desde ese callback sería redundante y, si el
  `setPaused` del motor alguna vez dejara de ser una asignación absoluta para convertirse
  en un toggle, causaría una doble inversión accidental. Por eso ambos `setPaused`
  (el del motor, guardado en `setPausedRef`, y el de `useState` en React) se mantienen
  como funciones distintas con responsabilidades distintas, nunca intercambiables.

- **`notifyState()` con guard de valores previos** — el loop corre a ~60 fps; sin guard,
  cada frame causaría un re-render de React innecesario.

- **`lastTime = null` en rama paused** — evita que al reanudar el `tickAccumulator`
  acumule el tiempo pausado y cause un salto de física (serpiente avanzando múltiples
  celdas de golpe).

- **`tickAccumulator = 0` al perder una vida** — mismo problema que el de `lastTime`,
  pero para el caso de respawn tras colisión sin game-over: sin este reinicio, el primer
  tick tras el respawn podría dispararse casi de inmediato.

- **`scoreSaved` ref en lugar de estado** — game-over y SALIR pueden ocurrir en
  secuencia rápida; una ref evita dos inserciones sin necesidad de estado adicional
  ni re-render.

- **3 vidas: reinicio de serpiente por colisión** — extiende la sesión de juego
  más allá del primer error; la serpiente vuelve a posición inicial pero el score
  acumulado se conserva.

- **Una sola condición de game-over (`lives === 0`)** — no hay condición de victoria;
  el campo `status` explícito no es necesario; React infiere game-over cuando recibe
  `lives === 0`.

- **Cuerpo de la serpiente con rectángulos de color** — el atlas provisto solo
  contiene sprites de frutas; dibujar el cuerpo con primitivas evita dependencia
  de assets externos adicionales.

- **`game_slug: 'snake'`** — coincide exactamente con el `slug` de la tabla `games`
  (requisito de la FK `scores.game_slug → games.slug`).

- **`image_url null`** — no hay portada disponible en este spec; se añade en un
  spec posterior sin bloquear la integración del juego.
