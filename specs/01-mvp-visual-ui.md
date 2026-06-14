# 01 — MVP Visual: Arcade Vault UI

- **Estado:** aprobado
- **Fecha:** 2026-06-13
- **Dependencias:** ninguna (spec inicial)
- **Objetivo:** Implementar las 5 pantallas visuales de Arcade Vault
  (Biblioteca, Detalle, Reproductor, Auth, Salón de la Fama) en Next.js
  App Router, fieles al diseño de referencia, sin lógica de juego real.

---

## Scope

### Dentro del scope
- Ruta `/` (redirect o alias) → Biblioteca
- Ruta `/biblioteca` → Library: hero, búsqueda, filtros por categoría, grid de cards con tilt
- Ruta `/detalle/[id]` → GameDetail: cover, tags, stats, leaderboard lateral, botones de acción
- Ruta `/player/[id]` → GamePlayer: HUD, pantalla CRT con animaciones CSS de enemigos/nave,
  ticker de puntuación (setInterval), modal de Game Over, pausa
- Ruta `/auth` → Auth: tabs Login/Registro, formulario, botones Google/GitHub (visuales)
- Ruta `/salon` → HallOfFame: tabs por juego, podio top-3, tabla de scores
- `Nav` compartido: logo, links, contador de créditos, botón auth, menú hamburguesa móvil
- `AuthProvider` (React Context + localStorage) para estado de sesión en toda la app
- `lib/data.ts` con `GAMES`, `CATS`, `seededScores`
- Importar `references/templates/styles.css` en `globals.css`
- Fuentes: Press Start 2P, Courier Prime, JetBrains Mono via `next/font/google`

### Fuera del scope
- Lógica real de ningún juego (colisiones, input de teclado para jugar, física)
- Backend, base de datos, autenticación real
- Guardado real de puntuaciones en servidor
- Rutas de admin o perfil de usuario
- Modo multijugador
- Internacionalización

---

## Data Model

### `lib/data.ts`
```ts
export interface Game {
  id: string
  title: string
  short: string
  long: string
  cat: string
  cover: string        // clase CSS: "cover-bricks" | "cover-tetro" | etc.
  color: "cyan" | "magenta" | "yellow" | "green"
  best: number
  plays: string
}

export interface ScoreRow {
  rank: number
  name: string
  score: number
  date: string
}

export interface User {
  name: string
}

export const GAMES: Game[]         // 8 juegos del template
export const CATS: string[]        // ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"]
export function seededScores(seed: number, count?: number): ScoreRow[]
```

### `AuthContext`
```ts
// app/_context/AuthContext.tsx
interface AuthContextValue {
  user: User | null
  login: (u: User) => void
  signOut: () => void
}
```
Estado persistido en `localStorage` bajo la clave `"av_user"`.
Puntuaciones guardadas en `localStorage` bajo `"av_scores"` (array de entradas).

---

## Implementation Plan

1. **Fuentes y estilos base**
   - Agregar Press Start 2P, Courier Prime, JetBrains Mono en `app/layout.tsx`
     via `next/font/google`, exponer como variables CSS
   - Copiar `references/templates/styles.css` al proyecto e importarlo en
     `app/globals.css`

2. **Datos mock**
   - Crear `lib/data.ts` con `GAMES`, `CATS`, `seededScores` tipados en TypeScript

3. **AuthContext**
   - Crear `app/_context/AuthContext.tsx` con provider, `login`, `signOut`,
     persistencia en localStorage
   - Envolver el root layout (`app/layout.tsx`) con `<AuthProvider>`

4. **Nav**
   - Crear `app/_components/Nav.tsx` (Client Component)
   - Logo, links Biblioteca / Salón de la Fama, contador créditos,
     botón auth, menú hamburguesa móvil

5. **Pantalla Biblioteca** (`app/biblioteca/page.tsx`)
   - Hero con título flickering y subtítulo
   - Barra de búsqueda + chips de categoría
   - Grid de `GameCard` con efecto tilt en hover

6. **Pantalla Detalle** (`app/detalle/[id]/page.tsx`)
   - Cover, tags, título, descripción, stat-strip
   - Botones "JUGAR AHORA" y "VOLVER AL VAULT"
   - Aside con leaderboard usando `seededScores`

7. **Pantalla Auth** (`app/auth/page.tsx`)
   - Tabs Login / Registro
   - Formulario con campos condicionales
   - Botones sociales visuales (Google, GitHub)
   - Al submit: llama `login()` del contexto, redirige a `/biblioteca`

8. **Pantalla Reproductor** (`app/player/[id]/page.tsx`)
   - HUD: jugador, puntuación, vidas, nivel
   - Pantalla CRT con animaciones CSS (enemigos, nave, grid-floor)
   - Ticker de puntuación con `setInterval`
   - Overlay de pausa
   - Modal de Game Over con input de nombre y guardado en localStorage

9. **Pantalla Salón de la Fama** (`app/salon/page.tsx`)
   - Tabs por juego
   - Podio top-3 (oro, plata, bronce)
   - Tabla completa de scores con fila del usuario autenticado

10. **Redirect raíz**
    - `app/page.tsx` redirige a `/biblioteca`

---

## Acceptance Criteria

- [ ] `/biblioteca` muestra el grid de 8 juegos; búsqueda y filtros por categoría
      reducen las cards en tiempo real
- [ ] Cada `GameCard` aplica el efecto tilt al mover el mouse encima
- [ ] `/detalle/[id]` muestra la info del juego correcto y un leaderboard de 10 filas
- [ ] `/player/[id]` muestra el HUD con ticker de puntuación incrementando;
      el botón PAUSA detiene el ticker; el botón FIN abre el modal de Game Over
- [ ] El modal de Game Over permite escribir un nombre y guardar en localStorage
- [ ] `/auth` alterna entre tabs Login y Registro; el campo Email aparece solo
      en Registro; al submit el usuario queda en el Nav
- [ ] `/salon` muestra el podio y la tabla; cambiar el tab por juego actualiza
      los scores; si hay sesión activa aparece la fila del usuario en amarillo
- [ ] El Nav muestra el nombre del usuario autenticado y permite cerrar sesión
- [ ] El menú hamburguesa funciona en mobile
- [ ] Las fuentes arcade (Press Start 2P, Courier Prime, JetBrains Mono) se
      aplican correctamente en toda la app
- [ ] `/` redirige a `/biblioteca`
- [ ] No hay errores de TypeScript (`tsc --noEmit` pasa sin errores)

---

## Decisions Taken and Discarded

- **Routing file-based sobre SPA con hash-router** — el template usa
  `location.hash` como router propio; descartado en favor de rutas de archivo
  de Next.js App Router para URLs limpias y convención del proyecto.

- **CSS del template importado directamente** — en lugar de portar todo a
  Tailwind v4 (costoso para MVP), se copia `styles.css` y se importa en
  `globals.css`. Tailwind sigue disponible para ajustes futuros.

- **React Context para auth sobre prop drilling** — el template pasa `user`
  por props desde `App`; descartado porque en App Router con rutas de archivo
  no hay un componente raíz compartido que pueda hacer prop drilling.

- **Fuentes via `next/font/google` sobre `<link>` en `<head>`** — el template
  carga fuentes con un `<link>` directo a Google Fonts; en Next.js se usa
  `next/font` para optimización automática y sin FOUT.

- **Sin lógica de juego real** — los juegos muestran animaciones CSS y un
  ticker simulado; toda interacción real (colisiones, input de teclado para
  jugar) queda fuera del scope de este spec.

- **Definición rápida en dos bloques** — se omitió una ronda adicional de
  preguntas sobre edge cases; el usuario confirmó las decisiones principales
  en dos bloques.

---

## Identified Risks

- **Compatibilidad de `styles.css` con Tailwind v4** — el CSS del template usa
  variables CSS propias (`--cyan`, `--magenta`, etc.) que podrían colisionar
  con las variables internas de Tailwind v4. Mitigación: revisar el prefijo de
  variables y renombrar si hay conflicto.

- **`next/font/google` con tres familias** — cargar tres familias puede
  aumentar el LCP en desarrollo. Sin impacto en producción gracias al
  auto-hosting de `next/font`, pero hay que verificar que los `variable` names
  no colisionen entre sí.

- **`params` en Next.js 16** — `params` en rutas dinámicas (`/detalle/[id]`,
  `/player/[id]`) son Promises en esta versión; hay que `await`arlos o usar
  `use()` de React 19. Riesgo de error en runtime si se accede síncronamente.

- **`setInterval` en Client Component con StrictMode** — React 19 en StrictMode
  monta los efectos dos veces en desarrollo; el ticker podría arrancar doble.
  Mitigación: cleanup correcto en el `return` del `useEffect`.
