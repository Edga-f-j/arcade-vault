# 06 — Leaderboard, Catálogo de Juegos y Scores

> **Status:** implementado · **Depends on:** 05-juego-asteroids · **Date:** 2026-06-16
> **Objective:** Implementar catálogo de juegos (`games`) y scores por jugador
> (`scores`) en Supabase, flujo de nombre-de-jugador con localStorage antes de
> cada partida en Asteroids, guardado de score al game over o al salir, y
> leaderboard global top-10 en `/salon` y en la home page.

---

## Contexto de rutas existentes

Las páginas de catálogo y leaderboard **ya existen** con UI completa pero datos mock:

| Ruta | Archivo | Estado actual |
|------|---------|---------------|
| `/biblioteca` | `app/biblioteca/page.tsx` | UI completa, usa `GAMES` mock de `@/lib/data` |
| `/salon` | `app/salon/page.tsx` | UI completa, usa `seededScores` mock de `@/lib/data` |

**No se crean rutas nuevas** (`/games`, `/leaderboard`). El trabajo es conectar las
páginas existentes a Supabase reemplazando los datos mock.

---

## Scope

**In:**
- Migración Supabase: tabla `games` (catálogo de juegos)
- Migración Supabase: tabla `scores` (puntajes por jugador)
- Fila inicial en `games` para Asteroids
- Regenerar `types/database.ts` con las nuevas tablas
- Modal de nombre antes de iniciar Asteroids (input + localStorage key `arcade_player_name`)
- Guardado de score en Supabase al game over (vidas = 0) y al pulsar SALIR (si score > 0)
- `/salon` (`app/salon/page.tsx`) — reemplazar `seededScores` mock por query real a `scores` top-10
- `/biblioteca` (`app/biblioteca/page.tsx`) — reemplazar `GAMES` mock por query real a tabla `games`
- Sección de leaderboard top-10 en la home page (`app/page.tsx`)

**Out of scope:**
- Crear rutas `/games` o `/leaderboard` — ya existen como `/biblioteca` y `/salon`
- Autenticación — el jugador se identifica solo por nombre (sin cuenta)
- Leaderboard por juego — queda para cuando haya más juegos o se añada auth
- Paginación del leaderboard — solo top-10, sin scroll infinito ni páginas
- Soporte táctil / móvil en el modal de nombre
- Admin panel para gestionar la tabla `games`
- Otros juegos aparte de Asteroids

---

## Data model

### Tabla `games`
| Columna       | Tipo    | Restricciones                     |
|---------------|---------|-----------------------------------|
| `id`          | uuid    | PK, default gen_random_uuid()     |
| `slug`        | text    | unique, not null                  |
| `name`        | text    | not null                          |
| `description` | text    | not null                          |
| `image_url`   | text    | nullable                          |
| `route`       | text    | not null                          |

Fila inicial:
```sql
('asteroids', 'Asteroids', 'Destruye asteroides y sobrevive el mayor tiempo posible.', null, '/games/asteroids')
```

### Tabla `scores`
| Columna       | Tipo        | Restricciones                     |
|---------------|-------------|-----------------------------------|
| `id`          | uuid        | PK, default gen_random_uuid()     |
| `player_name` | text        | not null                          |
| `game_slug`   | text        | not null, FK → games.slug         |
| `score`       | integer     | not null                          |
| `created_at`  | timestamptz | not null, default now()           |

### localStorage
- Clave: `arcade_player_name`
- Valor: string con el nombre del jugador
- Leído al abrir el modal (pre-rellena el input si existe)
- Escrito al confirmar el nombre

---

## Implementation plan

1. **Migraciones Supabase** — crear tablas `games` y `scores` vía MCP
   (`apply_migration`), incluyendo FK de `scores.game_slug → games.slug`

2. **Seed inicial** — insertar fila de Asteroids en `games` vía
   `execute_sql`

3. **Regenerar tipos** — ejecutar `generate_typescript_types` y sobrescribir
   `types/database.ts`

4. **Modal de nombre en Asteroids** (`app/games/asteroids/AsteroidsGame.tsx`)
   - Añadir estado `playerName` (string) y `gameStarted` (boolean)
   - Antes de mostrar el canvas, renderizar un overlay con:
     - Input texto pre-rellenado desde `localStorage.getItem('arcade_player_name')`
     - Botón "Jugar" que guarda el nombre en localStorage y activa `gameStarted`
   - El `useEffect` que llama `startGame` solo corre cuando `gameStarted === true`

5. **Guardado de score en Asteroids** (`app/games/asteroids/AsteroidsGame.tsx`)
   - Añadir función `saveScore(score: number)` que inserta en `scores` vía
     `createClient()` con `player_name`, `game_slug: 'asteroids'`, `score`
   - Llamar `saveScore` en el callback `onStateChange` cuando `lives === 0`
     (game over) — guardar solo una vez con una ref `scoreSaved`
   - Llamar `saveScore` al pulsar SALIR si `score > 0` y `!scoreSaved.current`

6. **`/salon`** (`app/salon/page.tsx`)
   - Convertir a Server Component (quitar `'use client'`)
   - Consulta Supabase servidor: `select player_name, score, game_slug, created_at from scores order by score desc limit 10`
   - Adaptar UI existente (podium + tabla) para usar los datos reales en lugar de `seededScores`
   - Eliminar las pestañas por juego (solo hay uno por ahora) o mantenerlas si la query lo permite

7. **`/biblioteca`** (`app/biblioteca/page.tsx`)
   - Separar la carga de datos: query `select * from games` en un Server Component padre
   - Pasar los juegos como props al componente cliente existente (mantiene filtros/búsqueda interactivos)
   - Adaptar `GameCard` para usar los campos de Supabase (`slug`, `name`, `description`, `route`)

8. **Sección leaderboard en home** (`app/page.tsx`)
   - Misma consulta top-10 directamente en el Server Component existente
   - Renderiza lista/tabla compacta con posición, jugador, juego, puntaje, fecha

9. **Verificación**
   - `tsc --noEmit` pasa sin errores
   - Modal aparece antes del canvas en `/games/asteroids`; nombre se pre-rellena
     en visitas posteriores
   - Score se guarda en Supabase al game over y al salir
   - `/salon` muestra top-10 con datos reales
   - Home muestra sección de leaderboard
   - `/biblioteca` lista Asteroids desde Supabase con enlace funcional

---

## Acceptance criteria

- [ ] Tabla `games` existe en Supabase con columnas: `id`, `slug`, `name`,
      `description`, `image_url`, `route`
- [ ] Tabla `scores` existe en Supabase con columnas: `id`, `player_name`,
      `game_slug`, `score`, `created_at`
- [ ] `scores.game_slug` tiene FK hacia `games.slug`
- [ ] Fila de Asteroids existe en `games` con slug `asteroids`
- [ ] `types/database.ts` refleja las nuevas tablas
- [ ] Al entrar a `/games/asteroids` aparece el modal de nombre antes del canvas
- [ ] El input del modal se pre-rellena con el valor de `localStorage` si existe
- [ ] Al confirmar el nombre se guarda en `localStorage` con clave `arcade_player_name`
- [ ] El juego no arranca hasta que el jugador confirme su nombre
- [ ] Al llegar a 0 vidas, el score se inserta una sola vez en `scores`
- [ ] Al pulsar SALIR con score > 0 (y no haberse guardado ya), el score se inserta en `scores`
- [ ] `/salon` muestra top-10 ordenado por score desc con: posición, jugador, juego, puntaje, fecha
- [ ] Home page incluye sección de leaderboard top-10 con los mismos datos
- [ ] `/biblioteca` lista todos los juegos de la tabla `games` con nombre, descripción y enlace
- [ ] No se han creado rutas `/games` ni `/leaderboard`
- [ ] `tsc --noEmit` pasa sin errores
- [ ] Las rutas existentes no se ven afectadas

---

## Decisions

- **Nombre de jugador en localStorage, sin auth** — la autenticación queda para
  un spec posterior. localStorage es suficiente para identificar al jugador entre
  sesiones sin fricción de registro. El riesgo (alguien puede suplantar un nombre)
  es aceptable en esta etapa.

- **Leaderboard global en lugar de por juego** — solo hay un juego por ahora.
  Filtrar por juego se añadirá cuando haya más de uno o cuando llegue la auth.

- **FK `scores.game_slug → games.slug`** en lugar de `game_id` (uuid) — el slug
  es legible en queries y en el código del cliente sin necesidad de un JOIN para
  obtener el nombre del juego. Cuando haya más juegos se evalúa si migrar a FK por id.

- **Guardado de score en el cliente (`AsteroidsGame.tsx`)** — el componente ya
  tiene acceso al score en tiempo real vía `onStateChange`. Usar un Server Action
  o Route Handler añadiría complejidad sin beneficio de seguridad mientras no haya
  auth (el jugador podría igualmente falsificar el score).

- **`scoreSaved` ref para evitar doble inserción** — game over y SALIR pueden
  ocurrir en secuencia rápida; una ref evita dos inserciones sin necesidad de
  estado adicional.

- **`/biblioteca` como Client Component con datos del servidor** — la UI de
  filtros y búsqueda requiere estado cliente. Se separa la carga de datos en un
  Server Component padre que pasa los juegos como props, manteniendo la
  interactividad existente.

- **`/salon` convertido a Server Component** — el leaderboard es datos estáticos
  en el momento de carga; no necesita estado cliente. Se elimina la dependencia
  de `useAuth` para el mock de "tu posición" (queda para cuando llegue auth real).

- **No se crean rutas `/games` ni `/leaderboard`** — las páginas `/biblioteca` y
  `/salon` ya cumplen esa función con UI construida. Crear rutas paralelas
  duplicaría código y fragmentaría la navegación existente.

- **Spec único para leaderboard + catálogo + scores** — aunque son tres áreas,
  comparten las mismas migraciones y el mismo cliente Supabase. Separarlos habría
  generado dependencias cruzadas entre specs consecutivos.
