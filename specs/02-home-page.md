# 02 — Home Page: Landing Page

> **Status:** Aprobado · **Depends on:** 01-mvp-visual-ui · **Date:** 2026-06-14
> **Objective:** Implementar la Home page en `/` como landing page de Arcade Vault, fiel al diseño de `references/templates/home-about/home.jsx`.

---

## Scope

**In:**

- `app/page.tsx` — Home page (reemplaza el redirect actual, pasa a ser la landing)
- Secciones: Hero, ¿Por qué Arcade Vault?, Juegos disponibles ahora, Stats, Actividad en vivo, Precios, CTA final
- Componentes privados en `app/page.tsx`: `FloatingSilhouettes`, `FeatureIcon`, `MiniCard`
- Hook `useReveal` (IntersectionObserver para animaciones scroll) en el mismo archivo
- Datos de actividad (últimas puntuaciones, top jugadores) como mock estático hardcodeado
- Navegación con `next/link` y `next/navigation` en lugar del `navigate()` del template
- Clases CSS del template (`home-hero`, `mini-card`, `home-stats`, etc.) ya presentes en `references/templates/styles.css` importado en `globals.css`

**Out of scope (para futuros specs):**

- Lógica real de puntuaciones o actividad en vivo (sin backend)
- Página `/about` (existe `about.jsx` en el template pero no está en este spec)
- Modificaciones a `/biblioteca`, `/detalle`, `/player`, `/auth`, `/salon`
- Animaciones o interacciones más allá de las definidas en el template

---

## Data model

Este spec no introduce estructuras de datos nuevas. Consume `GAMES` de `lib/data.ts` (ya existe en spec 01). Los arrays de actividad mock se declaran como constantes locales en `app/page.tsx` sin exportar.

---

## Implementation plan

1. **Reemplazar `app/page.tsx`**
   - Eliminar el redirect actual (`redirect('/biblioteca')`)
   - Convertir a Client Component (`'use client'`) — necesario para `useEffect` (useReveal) y `useRouter` (navegación en botones)
   - Agregar componentes privados en el mismo archivo, en este orden: `useReveal` → `FloatingSilhouettes` → `FeatureIcon` → `MiniCard` → `Home` (default export)

2. **Sección Hero**
   - Pixel eyebrow con blink cursor
   - Título en tres líneas con clases del template
   - Subtítulo y dos CTAs: "EXPLORAR JUEGOS" → `/biblioteca`, "CREAR CUENTA" → `/auth`

3. **Sección ¿Por qué Arcade Vault?**
   - Grid de 4 feature cards con `FeatureIcon` (GAMEPAD, FREE, TROPHY, ROCKET)
   - Animación reveal via `useReveal`

4. **Sección Juegos disponibles ahora**
   - `GAMES.slice(0, 6)` de `lib/data.ts`
   - Rail horizontal de `MiniCard`, cada una linkea a `/detalle/[id]`
   - Botón "VER TODOS" → `/biblioteca`

5. **Sección Stats**
   - Tres bloques estáticos: "12+ JUEGOS", "MILES DE PARTIDAS", "GLOBAL RANKING"

6. **Sección Actividad en vivo**
   - Ticker de 7 filas mock hardcodeadas (últimas puntuaciones)
   - Top 5 jugadores del día mock hardcodeados, botón → `/salon`

7. **Sección Precios**
   - Price card con lista de 6 beneficios y CTA → `/auth`
   - FAQ con 3 preguntas/respuestas estáticas

8. **Sección CTA Final**
   - Título pixel + botón "INSERTAR MONEDA" → `/biblioteca`

---

## Acceptance criteria

- [ ] `/` muestra la Home page (no redirige a `/biblioteca`)
- [ ] `/biblioteca` sigue funcionando igual que antes
- [ ] El Hero muestra el título en tres líneas, el eyebrow con blink cursor, y los dos CTAs funcionales
- [ ] "EXPLORAR JUEGOS" navega a `/biblioteca`; "CREAR CUENTA" navega a `/auth`
- [ ] La sección de features muestra 4 cards con sus íconos pixel SVG
- [ ] La sección de juegos muestra exactamente 6 MiniCards con título y categoría
- [ ] Cada MiniCard navega a `/detalle/[id]` del juego correspondiente
- [ ] "VER TODOS LOS JUEGOS" navega a `/biblioteca`
- [ ] La sección de stats muestra los 3 bloques estáticos
- [ ] La sección de actividad muestra el ticker de 7 filas y el top de 5 jugadores
- [ ] "VER SALÓN" navega a `/salon`
- [ ] La sección de precios muestra el price card con lista y los 3 FAQs
- [ ] "EMPEZAR GRATIS" navega a `/auth`; "INSERTAR MONEDA" navega a `/biblioteca`
- [ ] Las animaciones reveal se activan al hacer scroll (IntersectionObserver)
- [ ] `tsc --noEmit` pasa sin errores

---

## Decisions

- **`/` como landing en lugar de redirect a `/biblioteca`** — el spec-01 usaba `/` como alias de biblioteca; se reemplaza con la Home page real del template. El redirect se elimina y `/biblioteca` sigue siendo una ruta propia.
- **Client Component para `app/page.tsx`** — el template usa hooks (`useEffect`) y navegación imperativa; se añade `'use client'` en lugar de separar en sub-componentes server/client porque toda la página es interactiva.
- **Componentes privados en el mismo archivo** — `FloatingSilhouettes`, `FeatureIcon` y `MiniCard` no se reusan fuera de la Home; mantenerlos en `app/page.tsx` evita archivos innecesarios. Se comentan con encabezado para identificarlos.
- **Datos de actividad como mock estático** — sin backend real, los arrays se hardcodean en `app/page.tsx`. No se exponen en `lib/data.ts` porque son datos de presentación sin reutilización.
- **`next/link` y `useRouter` en lugar de `navigate()`** — el template SPA usa un prop `navigate`; en Next.js App Router se usa `<Link>` para links y `router.push()` para navegación imperativa en botones.
- **`MiniCard` nuevo en lugar de reutilizar `GameCard`** — el diseño de la Home usa una card más compacta (cover + título + categoría) distinta al `GameCard` de biblioteca (con tilt y más metadata).

---

## Risks

| Risk | Mitigation |
| ---- | ---------- |
| Clases CSS de la Home no presentes en `styles.css` (`home-silos`, `mini-rail`, `activity-grid`, `ticker`, `pricing-grid`, etc.) | Revisar `styles.css` antes de implementar y añadir los bloques faltantes a `globals.css` |
| `useReveal` con StrictMode monta el efecto dos veces | El cleanup `io.disconnect()` ya está en el template; verificar que se aplica correctamente |
| Clases `cover-bg cover-*` faltantes en `styles.css` para algún juego | Verificar que todos los valores de `cover` en `GAMES` tienen su clase CSS correspondiente |

---

## What is **not** in this spec

- Página `/about` (queda para un spec futuro si se decide implementar).
- Datos de actividad reales desde backend o localStorage.
- Modificaciones a cualquier otra ruta existente.
