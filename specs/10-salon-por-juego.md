# SPEC 10 — Salón de la fama por juego

> **Status:** aprobado · **Depends on:** 06-leaderboard-catalogo-scores · **Date:** 2026-06-17
> **Objective:** Reemplazar el leaderboard global de `/salon` por pestañas (una por juego) que muestran cada una el top-10 de ese juego con columnas posición, jugador, puntaje y fecha.

---

## Scope

**In:**

- `app/salon/page.tsx` — reemplazar query global por queries por juego; añadir UI de pestañas
- Una pestaña por cada juego registrado en `games` (actualmente: Asteroids, Tetris, Arkanoid, Snake)
- Cada pestaña muestra top-10 de ese juego ordenado por score desc
- Columnas por tabla: posición, jugador, puntaje, fecha
- La pestaña activa se mantiene con estado cliente (`'use client'` o componente hijo)

**Out of scope:**

- Crear rutas `/salon/:slug` — todo sigue en `/salon`
- Paginación — solo top-10 por juego
- Filtros adicionales (por fecha, por período)
- Sección "tu posición" — queda para cuando haya auth
- Modificar la home page (`app/page.tsx`) — el leaderboard compacto de la home no cambia

---

## Data model

No se introducen tablas ni columnas nuevas. Las queries cambian de una consulta global a una por juego:

```sql
-- antes (global)
SELECT player_name, score, game_slug, created_at
FROM scores ORDER BY score DESC LIMIT 10

-- ahora (por juego, ejecutada para cada slug)
SELECT player_name, score, created_at
FROM scores
WHERE game_slug = :slug
ORDER BY score DESC
LIMIT 10
```

Los slugs disponibles se obtienen de la tabla `games` (`SELECT slug, name FROM games ORDER BY name`).

---

## Implementation plan

1. **`app/salon/page.tsx`** — convertir a Server Component si no lo es ya
   - Query `games`: `SELECT slug, name FROM games ORDER BY name`
   - Por cada juego, query top-10: `SELECT player_name, score, created_at FROM scores WHERE game_slug = $slug ORDER BY score DESC LIMIT 10`
   - Pasar `games` y `scoresBySlug` como props al componente de pestañas

2. **`app/salon/SalonTabs.tsx`** — nuevo componente `'use client'`
   - Recibe `games: { slug: string; name: string }[]` y `scoresBySlug: Record<string, ScoreRow[]>`
   - `useState` para `activeTab` (slug activo, default: primer juego)
   - Renderiza pestañas horizontales; al hacer clic cambia `activeTab`
   - Renderiza la tabla de la pestaña activa con columnas: posición, jugador, puntaje, fecha
   - Si no hay scores para ese juego muestra un mensaje vacío ("Aún no hay partidas registradas")

3. **Limpiar `app/salon/page.tsx`**
   - Eliminar import de `seededScores` y cualquier dato mock
   - Eliminar columna "juego" de la UI (ya no es necesaria con pestañas por juego)

4. **Verificación**
   - `npx tsc --noEmit` pasa sin errores
   - `/salon` carga sin errores de consola
   - Cada pestaña muestra únicamente scores de ese juego
   - Cambiar de pestaña no provoca navegación ni recarga
   - Tabla vacía muestra mensaje en lugar de crash

---

## Acceptance criteria

- [ ] `/salon` sigue existiendo en la misma ruta, sin rutas nuevas
- [ ] La página muestra una pestaña por cada juego registrado en `games`
- [ ] La pestaña activa por defecto es el primer juego de la lista
- [ ] Cambiar de pestaña actualiza la tabla sin navegación ni recarga
- [ ] Cada tabla muestra únicamente scores del juego correspondiente
- [ ] Columnas visibles: posición, jugador, puntaje, fecha
- [ ] La columna "juego" ya no aparece en ninguna tabla
- [ ] Cada tabla está ordenada por score desc, máximo 10 filas
- [ ] Si un juego no tiene scores, se muestra mensaje "Aún no hay partidas registradas"
- [ ] `seededScores` mock eliminado de `app/salon/page.tsx`
- [ ] `npx tsc --noEmit` pasa sin errores
- [ ] Las demás rutas de la plataforma no se ven afectadas
- [ ] El leaderboard compacto de la home page (`app/page.tsx`) no cambia

---

## Decisions

- **Pestañas en lugar de secciones verticales o rutas separadas** — con 4 juegos, las secciones apiladas alargan la página innecesariamente; rutas separadas fragmentan la navegación. Las pestañas mantienen todo en `/salon` con UX limpia.

- **`SalonTabs.tsx` como componente cliente separado** — la interactividad de las pestañas requiere `useState`; extraerlo a un componente hijo permite que `page.tsx` siga siendo Server Component y haga las queries en servidor.

- **Queries por juego en el servidor, no en el cliente** — todas las consultas a Supabase se ejecutan en `page.tsx` (Server Component) y se pasan como props. Evita exponer credenciales en el cliente y reduce round-trips.

- **Slugs y nombres obtenidos de `games`, no hardcodeados** — si se añade un juego nuevo solo hace falta insertarlo en `games`; `/salon` lo mostrará automáticamente sin cambios de código.

- **Home page sin cambios** — el leaderboard compacto de `app/page.tsx` es global y cumple otra función (resumen rápido). Cambiarlo está fuera del alcance de este spec.
