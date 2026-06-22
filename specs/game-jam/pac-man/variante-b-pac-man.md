# SPEC — Juego: Pac-Man (Variante B — Enriquecida)

> **Status:** Draft · **Depends on:** 06-leaderboard-catalogo-scores · **Date:** 2026-06-21
> **Objective:** Integrar una versión enriquecida de Pac-Man (Canvas 2D desde cero) como
> página pública `/games/pac-man`, con todas las mecánicas core (laberinto, 4 fantasmas con
> IA distinta, power-pellets, progresión de nivel) más fruta bonus, encadenado de fantasmas
> con puntuación escalada, ciclos scatter/chase temporizados, varios layouts de laberinto y
> animación de Pac-Man, con guardado de score en Supabase al game-over o al pulsar SALIR.

---

## Scope

**In:**

- `app/games/pac-man/mazes.ts` — módulo puro que exporta **varios** layouts de laberinto
  (`MAZES: number[][][]`) y, por cada uno, las constantes derivadas (puntos, power-pellets,
  spawns de Pac-Man y fantasmas, casa de fantasmas, túnel, total de pellets). Sin imports.
- `app/games/pac-man/game.ts` — módulo ES puro (sin imports React/Next/Supabase);
  importa `./mazes`; exporta
  `startGame(canvas, onStateChange?, onPauseToggle?)` → `{ cleanup, setPaused }`
- `app/games/pac-man/PacManGame.tsx` — componente `'use client'` con HUD externo
  (jugador, puntuación, vidas, nivel) + canvas 800×600 envuelto en `.crt` / `.crt-screen`
- `app/games/pac-man/page.tsx` — Server Component que renderiza `<PacManGame />`
- Controles: `ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight` y `W`/`A`/`S`/`D` (teclado);
  `P` para pausar/reanudar
- **Mecánicas core (idénticas a la variante A):** movimiento alineado a rejilla con túnel
  lateral, 4 fantasmas con IA distinta (persecución, emboscada, aleatoria, mixta),
  power-pellets que ponen a los fantasmas en `frightened`, 3 vidas con reinicio de
  posiciones por colisión, progresión de nivel
- **Adiciones de la variante B:**
  - **Fruta bonus**: tras comer cierto número de puntos aparece una fruta en el centro del
    laberinto durante unos segundos; comerla otorga un bonus que escala con el nivel
  - **Encadenado de fantasmas**: comer varios fantasmas durante un mismo power-pellet
    escala la puntuación (200 → 400 → 800 → 1600)
  - **Ciclos scatter/chase temporizados**: todos los fantasmas alternan entre fase de
    dispersión (van a su esquina) y fase de caza, con duraciones que se acortan por nivel
  - **Varios layouts de laberinto**: cada nivel (o cada N niveles) usa un layout distinto
    de `mazes.ts`, en vez de reponer siempre el mismo
  - **Animación de Pac-Man**: la cuña de boca se abre y cierra en función del movimiento;
    los fantasmas parpadean (azul→blanco) en los últimos segundos de `frightened`
- 3 vidas; `lives === 0` → game-over
- Modal de nombre antes de iniciar (input + localStorage `arcade_player_name`)
- Botón PAUSA (congela el loop) y SALIR (guarda score si > 0 y vuelve a `/`)
- Guardado de score en Supabase al game-over o al pulsar SALIR (`scoreSaved` ref, una sola vez)
- INSERT en tabla `games` con slug `pac-man` e `image_url null`

**Out of scope:**

- Canvas responsivo — tamaño fijo 800×600 px
- Autenticación — el jugador se identifica solo por nombre en localStorage
- `image_url` de la tarjeta — se añade en un spec posterior
- Soporte táctil / móvil
- Admin panel para gestionar la tabla `games`
- Overlay "GAME OVER" / "NIVEL COMPLETADO" en canvas — lo reemplaza modal React
- Overlay de pausa en canvas — lo reemplaza React
- Sprites externos / atlas de imágenes — todo se dibuja con primitivas de canvas
- Sonidos
- Pantallas de transición animadas (cut-scenes) entre niveles

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
// condición fin de nivel: se comen todos los puntos y power-pellets del layout actual
//                       → status: 'levelclear' (el motor carga el siguiente layout de
//                         mazes.ts, sube level y continúa; el modal es informativo/breve)
```

> **Por qué hay campo `status`:** igual que en la variante A, Pac-Man tiene dos eventos de
> fin distintos (perder todas las vidas vs. limpiar el laberinto). `score`/`lives`/`level`
> por sí solos son ambiguos en el instante del evento, así que `onStateChange` los distingue
> con `status` explícito — nunca se infiere el resultado a partir de los contadores.

Constantes del motor (no cambian en runtime):

- Canvas: 800×600 px
- Tile: 20×20 px; el laberinto activo ocupa la rejilla centrada dentro del canvas
- `MAZES` definido en `mazes.ts` como array de matrices de tiles
- Pac-Man: velocidad base ~120 px/s, alineado a la rejilla; gira solo cuando la dirección
  deseada está libre en la siguiente intersección
- 4 fantasmas: velocidad base ~100 px/s; se aceleran ~6% por nivel (con tope)
- Estado "frightened": ~6 s decreciente por nivel; parpadeo azul→blanco en los ~2 s finales
- Encadenado de fantasmas por power-pellet: 200 / 400 / 800 / 1600 (se reinicia al expirar
  el `frightened` o al comer un nuevo power-pellet)
- Ciclos scatter/chase: tabla de fases por nivel (p.ej. scatter 7 s / chase 20 s,
  acortándose con el nivel)
- Fruta bonus: aparece tras comer ~70 puntos; visible ~9 s; bonus 100·(1 + level escalado)
- Vidas iniciales: 3
- Score: punto = 10 · power-pellet = 50 · fantasma encadenado = 200/400/800/1600 ·
  fruta bonus = según nivel
- Nivel: sube cada vez que se limpia el laberinto (status `levelclear`); el layout rota
  entre los de `mazes.ts`

Fila en Supabase:
```sql
-- NOTA: campos de categoría/color pendientes de decisión de proyecto (ver Scope).
INSERT INTO games (slug, name, description, image_url, route)
VALUES ('pac-man', 'Pac-Man',
        'El clásico del laberinto. Come todos los puntos esquivando a los cuatro fantasmas; usa los power-pellets para cazarlos, encadena capturas y atrapa la fruta bonus.',
        null,
        '/games/pac-man');
```

localStorage:
- Clave: `arcade_player_name` (compartida con Asteroids, Tetris, Arkanoid y Snake)

---

## Implementation plan

> Sin assets externos (todo en canvas 2D puro): el plan empieza en el paso 2.

2. **`app/games/pac-man/mazes.ts`** — módulo puro (sin imports externos)
   - Exporta `MAZES: number[][][]` con varios layouts; codificación de tiles, p.ej.
     `0 = pared`, `1 = camino con punto`, `2 = power-pellet`, `3 = camino vacío`,
     `4 = casa de fantasmas`, `5 = spawn Pac-Man`
   - Exporta constantes globales (`TILE`, `COLS`, `ROWS`) y, por layout, helpers/derivados:
     `pacmanSpawn`, `ghostSpawns` (4), `ghostHouse`, `tunnelRow`, `totalPellets`
   - Helpers puros que reciben un layout: `isWall(layout, col, row)`, `tileAt(layout, col, row)`

3. **`app/games/pac-man/game.ts`** — módulo puro (sin imports React/Next/Supabase;
   importa `./mazes`)
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
   - Estado interno encapsulado: índice del layout activo + copia mutable del layout (para
     borrar puntos), `pelletsLeft`, `pacman: {x, y, dir, nextDir, mouthPhase}`,
     `ghosts: { x, y, dir, mode: 'chase'|'scatter'|'frightened'|'eaten', kind }[]`,
     `frightenedTimer`, `ghostChainCount`, `phaseTimer` (scatter/chase),
     `fruit: { active, x, y, timer, value } | null`, `pelletsEatenForFruit`,
     `score`, `lives`, `level`, `status`, `isPaused`, `lastTime`, `rafId`
   - IA de fantasmas por `kind` (persecución / emboscada / aleatoria / mixta), igual que la
     variante A; en fase `scatter` todos se dirigen a su esquina asignada
   - **Ciclos scatter/chase**: `phaseTimer` alterna `mode` global entre `scatter` y `chase`
     según la tabla de fases del nivel; al cambiar de fase los fantalmas invierten dirección
     (regla clásica). El estado `frightened` tiene prioridad sobre scatter/chase
   - `eatPellet()`: borra el tile, suma score, decrementa `pelletsLeft`, incrementa
     `pelletsEatenForFruit`; si llega al umbral y no hay fruta activa, **activa la fruta
     bonus** en el centro con su `timer`; si el tile es power-pellet pone los fantasmas
     vivos en `frightened`, reinicia `frightenedTimer` y `ghostChainCount = 0`
   - Colisión Pac-Man ↔ fantasma:
     - `frightened` → suma `200 * 2^ghostChainCount` (tope 1600), incrementa
       `ghostChainCount`, el fantasma pasa a `eaten` y vuelve a la casa → `chase`/`scatter`
     - `chase`/`scatter` → pierde vida: si `lives > 1` decrementa, reinicia posiciones,
       `lastTime = null`, `notifyState()`; si `lives === 1` → 0, `status='gameover'`,
       remueve los event listeners de teclado (mismo procedimiento que `cleanup()`),
       `notifyState()`, cancela el RAF
   - Fruta bonus: si Pac-Man la pisa mientras `fruit.active`, suma `fruit.value`,
     `fruit = null`; expira sola al agotar su `timer`
   - Fin de nivel: cuando `pelletsLeft === 0` → `status='levelclear'`, `notifyState()`; el
     motor avanza al **siguiente layout** de `MAZES` (rotando), sube `level`, acelera
     fantasmas, ajusta la tabla de fases, reinicia posiciones, vuelve a `status='playing'`
   - `draw()`: paredes (`--cyan`), puntos, power-pellets parpadeantes, Pac-Man (círculo
     `--yellow` con boca **animada** por `mouthPhase` según `dir`), fantasmas (color por
     `kind`; `frightened` azul con **parpadeo a blanco** en los segundos finales; `eaten`
     solo ojos), fruta bonus cuando `fruit.active`
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
           'El clásico del laberinto. Come todos los puntos esquivando a los cuatro fantasmas; usa los power-pellets para cazarlos, encadena capturas y atrapa la fruta bonus.',
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
   - La fruta bonus aparece, es comestible y expira sola
   - Encadenar fantasmas en un power-pellet escala 200→400→800→1600
   - Las fases scatter/chase alternan y los fantasmas invierten dirección al cambiar
   - Limpiar el laberinto sube de nivel y carga el siguiente layout
   - Score se inserta una sola vez en `scores` al game-over y al pulsar SALIR

---

## Acceptance criteria

- [ ] `app/games/pac-man/mazes.ts` exporta `MAZES` (varios layouts) y derivados sin imports externos
- [ ] `app/games/pac-man/game.ts` existe y exporta únicamente `startGame`
- [ ] `startGame` no importa React, Next.js ni Supabase (solo `./mazes`)
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
- [ ] Las fases scatter/chase alternan por temporizador y los fantasmas invierten dirección al cambiar de fase
- [ ] Power-pellet pone los fantasmas vivos en `frightened` y reinicia el encadenado
- [ ] Encadenar fantasmas en un mismo power-pellet escala 200/400/800/1600
- [ ] Los fantasmas parpadean azul→blanco en los segundos finales de `frightened`
- [ ] La fruta bonus aparece tras el umbral de puntos, es comestible por su valor y expira sola
- [ ] La boca de Pac-Man se anima abriéndose y cerrándose según el movimiento
- [ ] Contacto con fantasma `chase`/`scatter` descuenta una vida y reinicia posiciones
- [ ] `lives === 0` cancela el loop, remueve los event listeners y notifica `status: 'gameover'`
- [ ] Limpiar todos los puntos carga el siguiente layout de `MAZES`, sube `level` y acelera fantasmas
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

- **`game.ts` sin imports externos (salvo `./mazes`)** — portabilidad y testabilidad: el
  módulo corre en cualquier entorno con un `HTMLCanvasElement`, sin runtime de React,
  Next.js ni Supabase.
- **`mazes.ts` con varios layouts como módulo separado** — los layouts son dato, no lógica;
  separarlos deja `game.ts` enfocado en movimiento, IA, fases y colisiones, y permite añadir
  o reordenar laberintos sin tocar el motor.
- **`onStateChange` incluye campo `status`** — Pac-Man tiene dos eventos de fin (derrota por
  `lives === 0` y fin de nivel al limpiar el laberinto); `lives`/`level` por sí solos no
  distinguen cuál ocurrió. `status: 'playing' | 'gameover' | 'levelclear'` lo hace explícito.
- **`onPauseToggle` como tercer parámetro de `startGame`** — la tecla `P` funciona sin
  desincronizar el `paused` de React con el `isPaused` del motor (patrón Snake). El callback
  en React solo actualiza estado local; el botón empuja al motor.
- **`notifyState()` con guard de valores previos** — el loop corre a ~60 fps; sin guard,
  cada frame causaría un re-render innecesario.
- **`lastTime = null` en rama paused y tras perder vida** — evita que al reanudar/respawnear
  el `dt` acumule tiempo y teletransporte a Pac-Man o a los fantasmas.
- **`scoreSaved` ref en lugar de estado** — game-over y SALIR pueden ocurrir en secuencia
  rápida; una ref evita doble insert sin re-render adicional.
- **Encadenado de fantasmas, fruta bonus, scatter/chase y varios layouts** — son las
  adiciones que diferencian esta variante de la A; profundizan el techo de habilidad
  (decisión de cuándo gastar el power-pellet, riesgo/recompensa de la fruta, lectura de las
  fases de los fantasmas) sin cambiar el contrato del motor ni el patrón de integración.
- **Esta variante sigue siendo un juego completo** — incluye todas las mecánicas core de la
  variante A y construye sobre ellas; nada de lo añadido depende de un spec aparte. Se puede
  implementar y jugar de forma autónoma, sin necesidad de la variante A.
- **Sin sprites ni sonidos** — incluso con las adiciones, todo se dibuja con primitivas de
  canvas (boca animada, parpadeo de fantasmas, fruta); evita dependencia de assets externos.
- **`game_slug: 'pac-man'`** — coincide exactamente con el `slug` de la tabla `games`
  (requisito de la FK `scores.game_slug → games.slug`).
- **`image_url null`** — no hay portada en este spec; se añade después sin bloquear.
