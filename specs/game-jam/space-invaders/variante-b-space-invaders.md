# SPEC — Juego: Space Invaders (Variante B — Enriquecida)

> **Status:** Draft · **Depends on:** 06-leaderboard-catalogo-scores · **Date:** 2026-06-21
> **Objective:** Integrar la versión enriquecida de Space Invaders (Canvas 2D diseñado desde
> cero) como página pública `/games/space-invaders`, con todas las mecánicas core (formación
> que avanza/desciende/acelera, disparo del jugador, fuego enemigo, oleadas crecientes,
> 3 vidas) más 4 escudos destructibles que absorben impactos y una nave nodriza (UFO bonus)
> que cruza la parte superior, con guardado de score en Supabase al game-over o al pulsar SALIR.

---

## Scope

**In:**

- `app/games/space-invaders/game.ts` — módulo ES puro (sin imports React/Next/Supabase);
  exporta `startGame(canvas, onStateChange?)` → `{ cleanup, setPaused }`
- `app/games/space-invaders/SpaceInvadersGame.tsx` — componente `'use client'` con HUD
  externo (jugador, puntuación, vidas, nivel) + canvas 800×600 envuelto en `.crt` / `.crt-screen`
- `app/games/space-invaders/page.tsx` — Server Component que renderiza `<SpaceInvadersGame />`
- **Todas las mecánicas core de la Variante A**: controles `ArrowLeft`/`ArrowRight` + `Space`
  (bala única); formación de 5×11 = 55 invasores que se mueve en bloque, baja un escalón e
  invierte dirección al tocar el borde, y acelera al quedar menos invasores vivos; fuego
  enemigo aleatorio (máx. 3 balas); oleadas infinitas con velocidad base creciente por
  `level`; 3 vidas; game-over por `lives === 0` o por un invasor que cruza la línea de suelo
- **4 escudos destructibles** sobre la nave: cada escudo es una rejilla de bloques pequeños
  que se erosiona pieza a pieza tanto con las balas del jugador (que lo atraviesan desde
  abajo) como con las balas enemigas; al destruir una pieza, esa porción del escudo deja de
  proteger
- **Nave nodriza (UFO bonus)**: aparece periódicamente y cruza la parte superior del canvas
  de lado a lado; destruirla otorga un bonus de puntos elevado; si sale del canvas sin ser
  alcanzada, desaparece sin penalización
- Modal de nombre antes de iniciar (input + localStorage `arcade_player_name`)
- Botón PAUSA (congela el loop) y SALIR (guarda score si > 0 y vuelve a `/`)
- Guardado de score en Supabase al game-over o al pulsar SALIR (`scoreSaved` ref, una sola vez)
- INSERT en tabla `games` con slug `space-invaders` e `image_url null`

**Out of scope:**

- Canvas responsivo — tamaño fijo 800×600 px
- Autenticación — el jugador se identifica solo por nombre en localStorage
- `image_url` de la tarjeta — se añade en un spec posterior
- Soporte táctil / móvil
- Admin panel para gestionar la tabla `games`
- Overlay "GAME OVER" en canvas — lo reemplaza modal React
- Overlay de pausa en canvas — lo reemplaza React
- Sonidos
- Sprites externos — invasores, nave, UFO, escudos y balas se dibujan con primitivas de
  canvas (`fillRect` / formas pixeladas)
- Power-ups que caen de enemigos (disparo múltiple, escudo recargable, etc.) — fuera de
  alcance también en esta variante

---

## Data model

```ts
type GameState = {
  score: number
  lives: number
  level: number
  status: 'playing' | 'gameover'
}
// condición game-over (A): lives === 0 (la nave recibe impactos hasta agotar las 3 vidas)
// condición game-over (B): cualquier invasor alcanza la línea de suelo (altura de la nave)
// Ambas condiciones producen status: 'gameover'. No hay condición de victoria: las oleadas
// son infinitas y la dificultad crece indefinidamente.
```

> **Nota — campos `cat`/`color` pendientes a nivel de proyecto.** La tabla `games` (ver
> `types/database.ts`) actualmente NO tiene columnas para categoría (`cat`) ni color de
> acento (`color`); sus columnas son `id`, `name`, `slug`, `description`, `route`,
> `image_url`. La categoría **SHOOTER** y el color **magenta** de este juego están
> pendientes de una decisión a nivel de proyecto: (a) agregar columnas `cat`/`color` a la
> tabla `games` en un spec de migración aparte, o (b) derivarlas en el frontend con un mapa
> `slug → categoría/color`. Hasta resolver esto, el INSERT de abajo queda **incompleto**
> respecto a categoría/color (solo inserta las columnas existentes). No bloquea la
> implementación del juego, pero debe resolverse para que `/biblioteca` muestre la
> categoría/color correctos.

Fila en Supabase (solo columnas existentes hoy):
```sql
INSERT INTO games (slug, name, description, image_url, route)
VALUES ('space-invaders', 'Space Invaders',
        'Defiende la Tierra de oleadas de alienígenas que descienden en formación. Refúgiate tras los escudos, caza la nave nodriza y destrúyelos a todos antes de que lleguen al suelo — cada oleada es más rápida.',
        null,
        '/games/space-invaders');
```

Constantes del motor (no cambian en runtime):
- Canvas: 800×600 px
- Formación: 5 filas × 11 columnas = 55 invasores; celda 40×30 px; separación 8 px
- Nave del jugador: ~50×24 px, velocidad ~350 px/s, posición inicial centrada en la base
- Bala del jugador: ~4×14 px, velocidad ~520 px/s hacia arriba; una sola activa a la vez
- Balas enemigas: ~4×14 px, velocidad ~220 px/s hacia abajo; máximo 3 simultáneas
- **Escudos**: 4 búnkeres equiespaciados sobre la nave (~y=480); cada uno es una rejilla de
  piezas pequeñas (~6×4 bloques de ~8 px); cada pieza se destruye con un impacto de
  cualquier bala (del jugador o enemiga)
- **Nave nodriza (UFO)**: ~60×24 px; aparece cada ~20–30 s, cruza por la parte superior
  (~y=40) de lado a lado a velocidad constante; bonus al destruirla (p.ej. 100–300 puntos)
- Vidas iniciales: 3
- Línea de suelo: ~y=560 (altura de la nave); si un invasor la cruza → game-over
- Velocidad base de la formación: aumenta por oleada (`level`); además acelera a medida que
  quedan menos invasores vivos dentro de la misma oleada
- Score por invasor: las filas superiores valen más (p.ej. 10 / 20 / 30 puntos según la fila)

localStorage:
- Clave: `arcade_player_name` (compartida con Asteroids, Tetris, Arkanoid y Snake)

---

## Implementation plan

(Todo el render es canvas 2D puro: no hay assets externos, por lo que no hay paso de copia
de assets — el plan empieza en el módulo `game.ts`.)

1. **`app/games/space-invaders/game.ts`** — módulo puro (sin imports React/Next/Supabase)
   - Firma exportada:
     ```ts
     export function startGame(
       canvas: HTMLCanvasElement,
       onStateChange?: (state: {
         score: number
         lives: number
         level: number
         status: 'playing' | 'gameover'
       }) => void
     ): { cleanup: () => void; setPaused: (p: boolean) => void }
     ```
   - Estado interno encapsulado: `invaders: {x,y,row,alive}[]`, `formationDir` (±1),
     `formationSpeed`, `player: {x}`, `playerBullet: {x,y}|null`,
     `enemyBullets: {x,y}[]`, `shields: {x,y,alive}[][]` (rejilla de piezas por escudo),
     `ufo: {x,active}|null`, `ufoTimer`, `score`, `lives`, `level`, `status`, `isPaused`,
     `lastTime`, `rafId`
   - `spawnWave(level)`: reconstruye los 55 invasores en su rejilla inicial, fija
     `formationSpeed` según `level`, resetea `formationDir`. **Los escudos NO se regeneran
     entre oleadas** (su erosión persiste para subir la dificultad).
   - `buildShields()`: crea los 4 búnkeres como rejillas de piezas; se llama al iniciar
   - `update(dt)`:
     - mueve la formación en bloque; al tocar un borde, baja un escalón e invierte
       `formationDir`; recalcula `formationSpeed` según invasores vivos
     - mueve la bala del jugador y las balas enemigas; genera fuego enemigo aleatorio
     - gestiona el `ufoTimer`: cuando vence, activa el UFO en un borde superior; mueve el
       UFO activo y lo desactiva al salir del canvas
     - colisiones:
       - bala del jugador vs invasor (marca `alive=false`, suma score, libera la bala)
       - bala del jugador vs UFO activo (suma bonus, desactiva UFO, libera la bala)
       - bala del jugador vs pieza de escudo (destruye la pieza, libera la bala)
       - bala enemiga vs pieza de escudo (destruye la pieza, limpia la bala)
       - bala enemiga vs nave (descuenta vida, reposiciona la nave, limpia la bala)
     - si no quedan invasores vivos: `level++`, `spawnWave(level)`
     - condiciones de fin: si `lives === 0` **o** algún invasor cruza la línea de suelo →
       `status = 'gameover'`; en ese caso, remover los event listeners de teclado de
       `document` de inmediato (mismo procedimiento interno que `cleanup()`),
       llamar `notifyState()` con `status: 'gameover'` y cancelar el RAF
   - `draw()`: fondo, invasores vivos, escudos (solo piezas `alive`), nave del jugador,
     bala del jugador, balas enemigas, UFO si está activo, línea de suelo
   - Game loop (`loop(ts)`):
     ```ts
     if (isPaused) { lastTime = null; rafId = requestAnimationFrame(loop); return }
     if (!lastTime) { lastTime = ts; rafId = requestAnimationFrame(loop); return }
     const dt = (ts - lastTime) / 1000
     lastTime = ts
     update(dt)
     draw()
     if (status === 'playing') rafId = requestAnimationFrame(loop)
     ```
   - `notifyState()` con guard: solo llama `onStateChange` cuando score/lives/level/status
     cambian respecto al frame anterior (evita 60 re-renders/seg)
   - `setPaused(p)`: asigna `isPaused = p` (asignación absoluta, no toggle); `lastTime = null`
     al pausar
   - Controles `keydown`/`keyup` en `document`: `ArrowLeft`/`ArrowRight` fijan la dirección
     de la nave; `Space` dispara si `playerBullet` es `null`. `cleanup()` los remueve.
   - `cleanup()`: cancela el RAF y remueve todos los event listeners de `document`

2. **`app/games/space-invaders/SpaceInvadersGame.tsx`** — componente `'use client'`
   - `useRef` para `canvasRef`, `setPausedRef` (guarda el `setPaused` devuelto por
     `startGame`), `scoreSaved`
   - `useState` para `score`, `lives`, `level`, `paused`, `playerName`, `gameStarted`,
     `gameOver`
   - `useEffect` inicial: pre-rellena `playerName` desde `localStorage`
   - `useEffect` condicional: corre solo cuando `gameStarted === true`; llama
     `startGame(canvasRef.current, callback)` y guarda el `setPaused` devuelto en
     `setPausedRef.current`; en el callback actualiza score/lives/level; cuando
     `status === 'gameover'` → activa `gameOver` y llama `saveScore()`
   - Botón PAUSA (clic): actualiza el estado local `setPaused(!paused)` y además llama
     `setPausedRef.current(!paused)` para empujar el cambio al motor (React origina la acción)
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

3. **`app/games/space-invaders/page.tsx`** — Server Component
   ```tsx
   import SpaceInvadersGame from './SpaceInvadersGame'
   export default function Page() { return <SpaceInvadersGame /> }
   ```

4. **INSERT en tabla `games`** — ejecutar vía Supabase MCP (`execute_sql`):
   ```sql
   INSERT INTO games (slug, name, description, image_url, route)
   VALUES ('space-invaders', 'Space Invaders',
           'Defiende la Tierra de oleadas de alienígenas que descienden en formación. Refúgiate tras los escudos, caza la nave nodriza y destrúyelos a todos antes de que lleguen al suelo — cada oleada es más rápida.',
           null, '/games/space-invaders');
   ```
   (INSERT incompleto respecto a `cat`/`color` — ver Nota en Data model.)
   Verificar que `/biblioteca` muestra la tarjeta de Space Invaders.

5. **Verificación final**
   - `npx tsc --noEmit` pasa sin errores
   - `/games/space-invaders` carga el juego sin errores de consola
   - Modal de nombre aparece antes del canvas; pre-rellena desde localStorage
   - HUD externo muestra jugador/puntuación/vidas/nivel actualizados en tiempo real
   - Los escudos se erosionan pieza a pieza con balas de ambos lados
   - El UFO bonus aparece, cruza la pantalla y otorga puntos al ser destruido
   - PAUSA congela el loop; REANUDAR lo retoma sin spike de dt
   - Score se inserta una sola vez en `scores` al game-over y al pulsar SALIR

---

## Acceptance criteria

- [ ] `app/games/space-invaders/game.ts` existe y exporta únicamente `startGame`
- [ ] `startGame` no importa React, Next.js ni Supabase
- [ ] `startGame` devuelve `{ cleanup, setPaused }`
- [ ] `cleanup` cancela el `requestAnimationFrame` loop y remueve todos los event listeners de `document`
- [ ] `onStateChange` entrega `{ score, lives, level, status }` solo cuando alguno de esos valores cambia
- [ ] `lastTime = null` al pausar; el loop lo detecta y restablece sin spike de dt
- [ ] La formación se mueve en bloque, baja un escalón e invierte dirección al tocar un borde
- [ ] La formación acelera a medida que quedan menos invasores vivos
- [ ] El jugador solo puede tener una bala activa a la vez
- [ ] Los invasores disparan hacia abajo de forma aleatoria, con un máximo de 3 balas enemigas simultáneas
- [ ] Hay 4 escudos destructibles; cada pieza se destruye con un impacto de cualquier bala (jugador o enemigo)
- [ ] Los escudos NO se regeneran entre oleadas (su erosión persiste)
- [ ] La nave nodriza (UFO) aparece periódicamente, cruza la parte superior y otorga un bonus al ser destruida
- [ ] El UFO desaparece sin penalización si sale del canvas sin ser alcanzado
- [ ] Cada impacto de bala enemiga sobre la nave descuenta una vida y la reposiciona
- [ ] `status === 'gameover'` cuando `lives === 0` O cuando un invasor alcanza la línea de suelo
- [ ] Al producirse el game-over, los event listeners de teclado se remueven de inmediato (sin esperar a React) y el RAF se cancela
- [ ] Destruir los 55 invasores genera una nueva oleada más rápida e incrementa `level`
- [ ] Score incrementa según la fila del invasor destruido (filas superiores valen más)
- [ ] Modal de nombre aparece antes del canvas; el juego no arranca hasta confirmar
- [ ] El input del modal se pre-rellena con `localStorage.getItem('arcade_player_name')` si existe
- [ ] Al confirmar el nombre se guarda en localStorage con clave `arcade_player_name`
- [ ] HUD externo muestra jugador, puntuación, vidas y nivel actualizados en tiempo real
- [ ] Botón PAUSA congela el loop; REANUDAR lo retoma
- [ ] Botón SALIR guarda el score (si > 0 y no guardado) y navega a `/`
- [ ] Modal de game-over aparece cuando `status === 'gameover'`
- [ ] Score se inserta una sola vez en `scores` al game-over y al pulsar SALIR (`scoreSaved` ref)
- [ ] `scores.game_slug` es exactamente `'space-invaders'`
- [ ] Fila en `games` existe con slug `space-invaders` e `image_url null`
- [ ] `/biblioteca` muestra la tarjeta de Space Invaders con nombre y descripción
- [ ] `/games/space-invaders` es la ruta — no `/games` ni `/space-invaders`
- [ ] `npx tsc --noEmit` pasa sin errores
- [ ] Las rutas existentes de la plataforma no se ven afectadas

---

## Decisions

- **`game.ts` sin imports externos** — portabilidad y testabilidad: el módulo puede
  ejecutarse en cualquier entorno con un `HTMLCanvasElement`, sin depender del runtime de
  React, Next.js ni Supabase.

- **`onStateChange` incluye campo `status`** — el juego tiene dos condiciones de fin
  (`lives === 0` y un invasor que cruza la línea de suelo). `lives`/`level` por sí solos no
  bastan para que React sepa que la partida terminó cuando un invasor llega al suelo aunque
  queden vidas. `status: 'playing' | 'gameover'` lo hace explícito. No hay `'win'`: las
  oleadas son infinitas.

- **Escudos como rejilla de piezas individuales** — permite la erosión gradual clásica de
  Space Invaders: cada bala destruye una sola pieza, y el escudo se desgasta progresivamente
  por ambos lados (las balas del jugador también lo perforan desde abajo).

- **Los escudos no se regeneran entre oleadas** — refuerza la curva de dificultad: el
  jugador empieza protegido pero pierde cobertura conforme avanza, lo que da peso estratégico
  a cuándo disparar a través de los propios escudos.

- **Nave nodriza (UFO) como objetivo de bonus** — añade un objetivo de oportunidad y riesgo
  (dejar de cubrirse para apuntar arriba) que enriquece la decisión momento a momento sin
  alterar las mecánicas core.

- **`notifyState()` con guard de valores previos** — el loop corre a ~60 fps; sin guard,
  cada frame causaría un re-render de React innecesario.

- **`lastTime = null` en rama paused** — evita que al reanudar el `dt` acumule el tiempo
  pausado y cause un salto de física.

- **`scoreSaved` ref en lugar de estado** — game-over y SALIR pueden ocurrir en secuencia
  rápida; una ref evita dos inserciones sin estado adicional ni re-render.

- **`game_slug: 'space-invaders'`** — coincide exactamente con el `slug` de la tabla `games`
  (requisito de la FK `scores.game_slug → games.slug`).

- **Render con primitivas de canvas, sin sprites** — escudos, UFO, invasores, nave y balas se
  dibujan con `fillRect`/formas pixeladas, sin assets externos.

- **`image_url null`** — no hay portada disponible en este spec; se añade después sin
  bloquear la integración del juego.

- **Esta variante es un juego completo por sí misma** — incluye íntegramente las mecánicas
  core de la Variante A y añade escudos y nave nodriza, que profundizan la decisión táctica
  y la rejugabilidad. No requiere la Variante A para ser jugable: es una alternativa de
  mayor scope, no una continuación. El usuario implementa **una** de las dos.
