# 05 — Juego: Asteroids

> **Status:** Aprobado · **Depends on:** 04-supabase-integracion-base · **Date:** 2026-06-15
> **Objective:** Integrar el juego Asteroids (Canvas/JS vanilla) en la plataforma
> como página pública `/games/asteroids`, con el game.js convertido a módulo ES
> y montado desde un componente React `'use client'`.

---

## Scope

**In:**
- `app/games/asteroids/page.tsx` — Server Component, usa el layout del sitio
  (header/nav de la plataforma visible encima del canvas)
- `app/games/asteroids/AsteroidsGame.tsx` — componente `'use client'` que monta
  el `<canvas>` 800×600 y arranca el juego vía `useEffect`
- `app/games/asteroids/game.ts` — `game.js` del template convertido a módulo ES:
  encapsula todo el estado, exporta `startGame(canvas): () => void`
- El HUD (score, nivel, vidas) se sigue dibujando dentro del canvas (sin cambios
  al JS de dibujo)
- Acceso público — no requiere autenticación

**Out of scope:**
- Canvas responsivo — tamaño fijo 800×600
- Guardar puntajes en Supabase — queda para un spec posterior
- Autenticación para jugar — queda para cuando se añadan puntajes
- Botón de pausa UI fuera del canvas
- Soporte táctil / móvil
- Añadir el juego al listado/navegación de la plataforma

---

## Implementation plan

1. **Convertir `game.js` a módulo ES** (`app/games/asteroids/game.ts`)
   - Copiar `references/templates/started-games/02-asteroids/game.js`
   - Reemplazar las referencias globales a `canvas`/`ctx` por parámetros
     recibidos en la función exportada
   - Encapsular todo el estado del juego (`ship`, `bullets`, `asteroids`, etc.)
     dentro de `startGame`
   - Exportar una sola función:
     ```ts
     export function startGame(canvas: HTMLCanvasElement): () => void
     ```
     que inicia el loop y devuelve una función de limpieza que cancela
     `requestAnimationFrame` y elimina los event listeners de teclado

2. **Componente cliente** (`app/games/asteroids/AsteroidsGame.tsx`)
   - `'use client'`
   - `useRef` para el `<canvas>`
   - `useEffect` que llama `startGame(canvasRef.current)` al montar y ejecuta
     la función de limpieza al desmontar
   - Renderiza solo `<canvas width={800} height={600} />`

3. **Página** (`app/games/asteroids/page.tsx`)
   - Server Component
   - Centra `<AsteroidsGame />` en la página dentro del layout del sitio

4. **Verificación**
   - `tsc --noEmit` pasa sin errores
   - El juego arranca en `/games/asteroids`, responde a teclado y el HUD
     muestra score/nivel/vidas correctamente

---

## Acceptance criteria

- [ ] `app/games/asteroids/game.ts` existe y exporta únicamente `startGame`
- [ ] `startGame` recibe un `HTMLCanvasElement` y devuelve una función de limpieza
- [ ] La función de limpieza cancela el `requestAnimationFrame` loop
- [ ] La función de limpieza elimina los event listeners de teclado (`keydown`/`keyup`)
- [ ] `app/games/asteroids/AsteroidsGame.tsx` tiene `'use client'` y monta el canvas
      con `useEffect`
- [ ] `app/games/asteroids/page.tsx` existe como Server Component
- [ ] La ruta `/games/asteroids` carga el juego sin errores de consola
- [ ] El juego responde a `ArrowLeft`, `ArrowRight`, `ArrowUp` y `Space`
- [ ] El HUD muestra score, nivel y vidas dentro del canvas
- [ ] Al desmontar el componente no quedan listeners ni loops activos (sin memory leaks)
- [ ] `tsc --noEmit` pasa sin errores
- [ ] Las rutas existentes de la plataforma no se ven afectadas

---

## Decisions

- **`app/games/asteroids/` en lugar de `games/` en la raíz** — colocar los
  archivos dentro del App Router directory mantiene la convención del proyecto
  y facilita el co-location de futuros assets del juego junto a su ruta.

- **`startGame(canvas): () => void` como única API pública** — encapsular todo
  el estado dentro de la función evita globals y hace el ciclo de vida
  predecible para React: montar = iniciar, desmontar = limpiar.

- **HUD permanece en el canvas** — mover score/vidas a React requeriría
  exponer estado del juego vía callbacks o refs. El HUD actual dibujado en
  canvas es suficiente y evita acoplar el JS del juego al sistema de estado
  de React en este spec.

- **Canvas fijo 800×600** — se pospone la responsividad para no modificar la
  lógica de colisión ni las constantes `W`/`H` del juego en este spec.

- **Sin score en Supabase** — guardado de puntajes queda para cuando se
  implemente autenticación; ambas features van juntas en un spec posterior.

- **Acceso público** — la autenticación se añadirá en el spec de scores,
  donde tendrá sentido restringir el acceso a usuarios con sesión activa.
