# SPEC — Juego: Pac-Man (Variante A — Core)

> **Status:** Draft · **Depends on:** 06-leaderboard-catalogo-scores · **Date:** 2026-06-21
> **Objective:** Integrar la versión core de Pac-Man (Canvas 2D diseñado desde cero) como
> página pública `/games/pac-man`, con `game.ts` encapsulado, HUD externo React
> (jugador/puntuación/vidas/nivel), un único laberinto, 4 fantasmas con IA distinta,
> power-pellets que invierten roles, y guardado de score en Supabase al game-over o al
> pulsar SALIR.

---

## Scope

**In:**

- `app/games/pac-man/maze.ts` — módulo puro que exporta el layout del laberinto como
  matriz de tiles (`MAZE: number[][]`) y constantes derivadas (celdas con punto,
  celdas con power-pellet, posiciones de spawn de Pac-Man y de los 4 fantasmas, casa de
  fantasmas, túnel lateral). Sin imports externos.
- `app/games/pac-man/game.ts` — módulo ES puro (sin imports React/Next/Supabase);
  importa `./maze`; exporta
  `startGame(canvas, onStateChange?, onPauseToggle?)` → `{ cleanup, setPaused }`
- `app/games/pac-man/PacManGame.tsx` — componente `'use client'` con HUD externo
  (jugador, puntuación, vidas, nivel) + canvas 800×600 envuelto en `.crt` / `.crt-screen`
- `app/games/pac-man/page.tsx` — Server Component que renderiza `<PacManGame />`
- Controles: `ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight` y `W`/`A`/`S`/`D` (teclado)
  para fijar la dirección deseada de Pac-Man; `P` para pausar/reanudar
- Un único laberinto reutilizado en todos los niveles; al limpiar todos los puntos el
  laberinto se reinicia (puntos repuestos) y sube `level` con fantasmas más rápidos
- 4 fantasmas con IA distinta: persecución directa, emboscada (apunta delante de Pac-Man),
  aleatoria, y mixta (alterna entre perseguir y dispersarse)
- Power-pellets: al comerlos los fantasmas entran en estado "frightened" durante unos
  segundos (Pac-Man puede comerlos por puntos; el fantasma comido vuelve a la casa)
- 3 vidas: el contacto con un fantasma no asustado descuenta una vida y reinicia las
  posiciones de Pac-Man y fantasmas; `lives === 0` → game-over
- Modal de nombre antes de iniciar (input + localStorage `arcade_player_name`)
- Botón PAUSA (congela el loop) y SALIR (guarda score si > 0 y vuelve a `/`)
- Guardado de score en Supabase al game-over o al pulsar SALIR (`scoreSaved` ref, una sola vez)
- INSERT en tabla `games` con slug `pac-man` e `image_url null`

**Out of scope:**

- Las características de la **variante B** (fruta bonus, animación de boca de Pac-Man,
  modos scatter/chase temporizados por nivel, bonificación por comer varios fantasmas
  encadenados en un mismo power-pellet, múltiples layouts de laberinto, sonidos)
- Canvas responsivo — tamaño fijo 800×600 px
- Autenticación — el jugador se identifica solo por nombre en localStorage
- `image_url` de la tarjeta — se añade en un spec posterior
- Soporte táctil / móvil
- Admin panel para gestionar la tabla `games`
- Overlay "GAME OVER" / "NIVEL COMPLETADO" en canvas — lo reemplaza modal React
- Overlay de pausa en canvas — lo reemplaza React
- Sprites externos / atlas de imágenes — todo se dibuja con primitivas de canvas
- Sonidos

> **Pendiente a nivel de proyecto (categoría / color de acento):** la tabla `games`
> (ver `types/database.ts`) **no** tiene columnas para categoría (`cat`) ni color de
> acento (`color`). La ficha define este juego como `ARCADE` / `yellow`, pero esos
> valores **no** pueden incluirse en el INSERT hasta que se decida a nivel de proyecto
> entre: (a) añadir columnas `cat` y `color` a la tabla `games` mediante un spec de
> migración, o (b) derivarlas en el frontend con un mapa `slug → categoría/color`.
> Mientras tanto el INSERT de abajo queda **incompleto** respecto a esos dos campos.

---

## Data model

```ts
type GameState = {
  score: number
  lives: number
  level: number
  status: 'playing' | 'gameover' | 'levelclear'
}
// condición game-over: lives === 0 (contacto con fantasma no asustado agota las 3 vidas)
//                       → status: 'gameover'
// condición fin de nivel: se comen todos los puntos y power-pellets del laberinto
//                       → status: 'levelclear' (el motor repone los puntos, sube level
//                         y continúa; el modal de nivel completado es informativo/breve)
```

> **Por qué hay campo `status`:** Pac-Man tiene dos eventos de fin distintos (perder todas
> las vidas vs. limpiar el laberinto). `score`/`lives`/`level` por sí solos son ambiguos en
> el instante del evento, así que `onStateChange` los distingue con `status` explícito —
> nunca se infiere el resultado a partir de los contadores.

Constantes del motor (no cambian en runtime):

- Canvas: 800×600 px
- Tile: 20×20 px; el laberinto ocupa la rejilla centrada dentro del canvas
- `MAZE` definido en `maze.ts` como matriz de tiles (pared / camino-con-punto /
  power-pellet / vacío / casa-de-fantasmas / spawn)
- Pac-Man: velocidad base ~120 px/s, alineado a la rejilla; solo gira cuando la dirección
  deseada está libre en la siguiente intersección
- 4 fantasmas: velocidad base ~100 px/s; se aceleran ~6% por nivel (con tope)
- Estado "frightened" tras power-pellet: ~6 s, decreciente con el nivel
- Vidas iniciales: 3
- Score: punto = 10 · power-pellet = 50 · fantasma asustado comido = 200
- Nivel: sube cada vez que se limpia el laberinto (status `levelclear`)

Fila en Supabase:
```sql
-- NOTA: campos de categoría/color pendientes de decisión de proyecto (ver Scope).
INSERT INTO games (slug, name, description, image_url, route)
VALUES ('pac-man', 'Pac-Man',
        'El clásico del laberinto. Come todos los puntos esquivando a los cuatro fantasmas; usa los power-pellets para cazarlos por unos segundos.',
        null,
        '/games/pac-man');
```

localStorage:
- Clave: `arcade_player_name` (compartida con Asteroids, Tetris, Arkanoid y Snake)

---

## Implementation plan

> Sin assets externos (todo en canvas 2D puro): el plan empieza en el paso 2.

2. **`app/games/pac-man/maze.ts`** — módulo puro (sin imports externos)
   - Exporta `MAZE: number[][]` con codificación de tiles, p.ej.
     `0 = pared`, `1 = camino con punto`, `2 = power-pellet`, `3 = camino vacío`,
     `4 = casa de fantasmas`, `5 = spawn Pac-Man`
   - Exporta constantes derivadas: `TILE`, `COLS`, `ROWS`, `PACMAN_SPAWN`,
     `GHOST_SPAWNS` (4 posiciones), `GHOST_HOUSE`, `TUNNEL_ROW` (fila del túnel lateral
     que conecta ambos bordes) y `TOTAL_PELLETS` (puntos + power-pellets a comer)
   - Helpers puros: `isWall(col, row)`, `tileAt(col, row)`

3. **`app/games/pac-man/game.ts`** — módulo puro (sin imports React/Next/Supabase;
   importa `./maze`)
   - Firma exportada:
     ```ts
     export function startGame(
       canvas: HTMLCanvasElement,
       onStateChange?: (state: {
         score: number
         lives: number
         level: number
         status: 'playing' | 'gameover' | 'levelclear'
       }) => void,
       onPauseToggle?: (paused: boolean) => void
     ): { cleanup: () => void; setPaused: (p: boolean) => void }
     ```
   - Estado interno encapsulado: copia mutable del `MAZE` (para borrar puntos comidos),
     `pelletsLeft`, `pacman: {x, y, dir, nextDir}`,
     `ghosts: { x, y, dir, mode: 'chase'|'frightened'|'eaten', kind }[]`,
     `frightenedTimer`, `score`, `lives`, `level`, `status`, `isPaused`, `lastTime`,
     `rafId`
   - IA de fantasmas (en cada intersección elige dirección, sin invertir 180° salvo al
     cambiar de modo):
     - **Persecución**: minimiza distancia al tile de Pac-Man
     - **Emboscada**: apunta a un tile N celdas por delante de Pac-Man según su dirección
     - **Aleatoria**: elige al azar entre las direcciones válidas
     - **Mixta**: alterna entre perseguir y dirigirse a una esquina fija (dispersión)
   - `eatPellet()`: al pisar tile con punto/power-pellet, lo borra de la copia del maze,
     suma score, decrementa `pelletsLeft`; si es power-pellet pone todos los fantasmas
     vivos en `mode='frightened'` y arranca `frightenedTimer`
   - Colisión Pac-Man ↔ fantasma:
     - fantasma `chase` → pierde vida: si `lives > 1` decrementa, reinicia posiciones de
       Pac-Man y fantasmas, `lastTime = null`, `notifyState()`; si `lives === 1` →
       decrementa a 0, `status='gameover'`, remueve los event listeners de teclado
       (mismo procedimiento que `cleanup()`), `notifyState()`, cancela el RAF
     - fantasma `frightened` → suma 200, ese fantasma pasa a `mode='eaten'` y regresa a
       la casa, donde vuelve a `chase`
   - Fin de nivel: cuando `pelletsLeft === 0` → `status='levelclear'`, `notifyState()`;
     el motor repone `MAZE`, sube `level`, acelera fantasmas, reinicia posiciones, vuelve
     a `status='playing'` y continúa (el modal React es breve/informativo)
   - `draw()`: paredes (trazo `--cyan`), puntos (círculos pequeños), power-pellets
     (círculos grandes parpadeantes), Pac-Man (círculo `--yellow` con cuña de boca según
     `dir`), fantasmas (cuerpo de color por `kind`; en `frightened` color azul; en
     `eaten` solo ojos)
   - Game loop `loop(ts)`:
     ```ts
     if (isPaused) { lastTime = null; rafId = requestAnimationFrame(loop); return }
     if (!lastTime) { lastTime = ts; rafId = requestAnimationFrame(loop); return }
     const dt = (ts - lastTime) / 1000; lastTime = ts
     update(dt); draw()
     if (status !== 'gameover') rafId = requestAnimationFrame(loop)
     ```
   - `notifyState()` con guard: solo llama `onStateChange` cuando score/lives/level/status
     cambian respecto al frame anterior (evita 60 re-renders/seg)
   - `setPaused(p)`: asignación absoluta de `isPaused = p`; `lastTime = null` al pausar.
     Única función con este nombre en el módulo.
   - Tecla `P`: el handler calcula `next = !isPaused`, llama a su propio `setPaused(next)`
     y luego `onPauseToggle?.(next)` para sincronizar React
   - `cleanup()`: cancela el RAF y remueve todos los event listeners de `document`

4. **`app/games/pac-man/PacManGame.tsx`** — componente `'use client'`
   - `useRef` para `canvasRef`, `setPausedRef` (guarda el `setPaused` del motor, distinto
     del `setPaused` de `useState`), `scoreSaved`
   - `useState` para `score`, `lives`, `level`, `paused`, `playerName`, `gameStarted`,
     `gameOver`
   - `useEffect` inicial: pre-rellena `playerName` desde `localStorage`
   - `useEffect` condicional (solo cuando `gameStarted === true`): llama
     `startGame(canvasRef.current, callback, onPauseToggle)` y guarda el `setPaused`
     devuelto en `setPausedRef.current`; en el callback actualiza score/lives/level y,
     cuando `status === 'gameover'`, activa `gameOver` y llama `saveScore()`. El
     `status === 'levelclear'` solo actualiza el HUD (no termina la partida)
   - `onPauseToggle(p)`: actualiza **únicamente** el estado local de React (`setPaused(p)`);
     nunca llama `setPausedRef.current(p)` (el motor ya aplicó el cambio al procesar `P`)
   - Botón PAUSA (clic): actualiza estado local `setPaused(!paused)` **y** llama
     `setPausedRef.current(!paused)` (React origina la acción)
   - `saveScore()`: inserta en `scores` vía `createClient()` con guard `scoreSaved.current`
   - `handleExit()`: llama `saveScore(score)` antes de `router.push('/')`
   - Estructura visual (patrón Asteroids/Tetris/Arkanoid/Snake):
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
           <canvas ref=canvasRef width=800 height=600>
         .crt-bottom  (LED verde + info técnica)
     ```

5. **`app/games/pac-man/page.tsx`** — Server Component
   ```tsx
   import PacManGame from './PacManGame'
   export default function Page() { return <PacManGame /> }
   ```

6. **INSERT en tabla `games`** — ejecutar vía Supabase MCP (`execute_sql`):
   ```sql
   -- NOTA: campos de categoría/color pendientes de decisión de proyecto (ver Scope).
   INSERT INTO games (slug, name, description, image_url, route)
   VALUES ('pac-man', 'Pac-Man',
           'El clásico del laberinto. Come todos los puntos esquivando a los cuatro fantasmas; usa los power-pellets para cazarlos por unos segundos.',
           null, '/games/pac-man');
   ```
   Verificar que `/biblioteca` muestra la tarjeta de Pac-Man.

7. **Verificación final**
   - `npx tsc --noEmit` pasa sin errores
   - `/games/pac-man` carga el juego sin errores de consola
   - Modal de nombre aparece antes del canvas; pre-rellena desde localStorage
   - HUD externo muestra jugador/puntuación/vidas/nivel actualizados en tiempo real
   - PAUSA (botón y tecla `P`) congela el loop; REANUDAR lo retoma sin spike de dt
   - Alternar botón y tecla `P` repetidamente nunca desincroniza `paused`/`isPaused`
   - Limpiar el laberinto sube de nivel y repone los puntos
   - Score se inserta una sola vez en `scores` al game-over y al pulsar SALIR

---

## Acceptance criteria

- [ ] `app/games/pac-man/maze.ts` exporta `MAZE` y constantes derivadas sin imports externos
- [ ] `app/games/pac-man/game.ts` existe y exporta únicamente `startGame`
- [ ] `startGame` no importa React, Next.js ni Supabase (solo `./maze`)
- [ ] `startGame` devuelve `{ cleanup, setPaused }`
- [ ] `cleanup` cancela el `requestAnimationFrame` loop y remueve todos los event listeners de `document`
- [ ] `onStateChange` entrega `{ score, lives, level, status }` solo cuando alguno cambia
- [ ] `status` es `'gameover'` cuando `lives === 0` y `'levelclear'` al limpiar el laberinto
- [ ] El resultado de fin de partida nunca se infiere de score/lives/level — siempre vía `status`
- [ ] `onPauseToggle` se llama al presionar `P`, con el nuevo valor `paused`
- [ ] El callback `onPauseToggle` en React actualiza solo el estado local y nunca llama `setPausedRef.current()`
- [ ] El botón PAUSA y la tecla `P` producen el mismo resultado, incluso alternándolos varias veces
- [ ] `lastTime = null` al pausar y al perder una vida; el loop lo detecta sin spike de dt
- [ ] Pac-Man solo gira cuando la dirección deseada está libre; respeta el túnel lateral
- [ ] Cada fantasma usa su IA: persecución / emboscada / aleatoria / mixta
- [ ] Power-pellet pone los fantasmas vivos en `frightened` durante el tiempo definido
- [ ] Comer un fantasma asustado suma 200, lo manda a la casa y vuelve a `chase`
- [ ] Contacto con fantasma `chase` descuenta una vida y reinicia posiciones
- [ ] `lives === 0` cancela el loop, remueve los event listeners y notifica `status: 'gameover'`
- [ ] Limpiar todos los puntos repone el laberinto, sube `level` y acelera fantasmas
- [ ] Modal de nombre aparece antes del canvas; el juego no arranca hasta confirmar
- [ ] El input del modal se pre-rellena con `localStorage.getItem('arcade_player_name')` si existe
- [ ] Al confirmar el nombre se guarda en localStorage con clave `arcade_player_name`
- [ ] HUD externo muestra jugador, puntuación, vidas y nivel en tiempo real
- [ ] Botón PAUSA congela el loop; REANUDAR lo retoma
- [ ] Botón SALIR guarda el score (si > 0 y no guardado) y navega a `/`
- [ ] Modal de game-over aparece cuando `status === 'gameover'`
- [ ] Score se inserta una sola vez en `scores` al game-over y al pulsar SALIR (`scoreSaved` ref)
- [ ] `scores.game_slug` es exactamente `'pac-man'`
- [ ] Fila en `games` existe con slug `pac-man` e `image_url null`
- [ ] `/biblioteca` muestra la tarjeta de Pac-Man con nombre y descripción
- [ ] `/games/pac-man` es la ruta — no `/games` ni `/pacman`
- [ ] `npx tsc --noEmit` pasa sin errores
- [ ] Las rutas existentes de la plataforma no se ven afectadas

---

## Decisions

- **`game.ts` sin imports externos (salvo `./maze`)** — portabilidad y testabilidad: el
  módulo corre en cualquier entorno con un `HTMLCanvasElement`, sin runtime de React,
  Next.js ni Supabase.
- **`maze.ts` como módulo separado** — el layout del laberinto es dato, no lógica;
  separarlo deja `game.ts` enfocado en movimiento, IA y colisiones, y permite que la
  variante B añada más layouts sin tocar el motor.
- **`onStateChange` incluye campo `status`** — Pac-Man tiene dos eventos de fin (derrota
  por `lives === 0` y fin de nivel al limpiar el laberinto); `lives`/`level` por sí solos
  no distinguen cuál ocurrió. `status: 'playing' | 'gameover' | 'levelclear'` hace
  explícito qué modal/comportamiento aplicar.
- **`onPauseToggle` como tercer parámetro de `startGame`** — permite que la tecla `P`
  funcione sin desincronizar el `paused` de React con el `isPaused` del motor (patrón
  Snake). El callback en React solo actualiza estado local; el botón empuja al motor.
- **`notifyState()` con guard de valores previos** — el loop corre a ~60 fps; sin guard,
  cada frame causaría un re-render innecesario.
- **`lastTime = null` en rama paused y tras perder vida** — evita que al reanudar/respawnear
  el `dt` acumule tiempo y teletransporte a Pac-Man o a los fantasmas.
- **`scoreSaved` ref en lugar de estado** — game-over y SALIR pueden ocurrir en secuencia
  rápida; una ref evita doble insert sin re-render adicional.
- **3 vidas con reinicio de posiciones por colisión** — extiende la sesión más allá del
  primer error; el score acumulado se conserva.
- **Esta variante es un juego completo por sí misma** — un laberinto, los 4 fantasmas con
  IA distinta, power-pellets funcionales y progresión de nivel infinita por reposición del
  laberinto bastan para una sesión de Pac-Man satisfactoria. Las adiciones de la variante B
  (fruta bonus, encadenado de fantasmas, scatter/chase temporizado, más layouts) enriquecen
  pero no son necesarias para que el juego sea jugable y rejugable.
- **Sin sprites ni sonidos** — todo se dibuja con primitivas de canvas; elimina dependencia
  de assets externos y mantiene el scope core contenido.
- **`game_slug: 'pac-man'`** — coincide exactamente con el `slug` de la tabla `games`
  (requisito de la FK `scores.game_slug → games.slug`).
- **`image_url null`** — no hay portada en este spec; se añade después sin bloquear.
