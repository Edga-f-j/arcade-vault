# 05 — Juego: Asteroids

> **Status:** Implementado · **Depends on:** 04-supabase-integracion-base · **Date:** 2026-06-15
> **Objective:** Integrar el juego Asteroids (Canvas/JS vanilla) en la plataforma
> como página pública `/games/asteroids`, con el game.js convertido a módulo ES,
> HUD externo React consistente con el resto de juegos, y canvas envuelto en el
> componente visual CRT de la plataforma.

---

## Scope

**In:**
- `app/games/asteroids/game.ts` — `game.js` convertido a módulo ES: encapsula todo
  el estado, exporta `startGame(canvas, onStateChange?)` y devuelve `{ cleanup, setPaused }`
- `app/games/asteroids/AsteroidsGame.tsx` — componente `'use client'` con HUD externo
  (`.player-hud`) + canvas envuelto en `.crt` / `.crt-screen`
- `app/games/asteroids/page.tsx` — Server Component que renderiza `<AsteroidsGame />`
- HUD externo React (jugador, puntuación, vidas ♥, nivel) actualizado vía callback
- Botón PAUSA (congela el loop del juego) y SALIR (vuelve a `/`)
- Flechas y Space con `preventDefault` para evitar scroll de página
- Acceso público — no requiere autenticación

**Out of scope:**
- Canvas responsivo — tamaño fijo 800×600
- Guardar puntajes en Supabase — queda para un spec posterior
- Autenticación para jugar — queda para cuando se añadan puntajes
- Soporte táctil / móvil
- Añadir el juego al listado/navegación de la plataforma

---

## Implementation plan

1. **Convertir `game.js` a módulo ES** (`app/games/asteroids/game.ts`)
   - Copiar `references/templates/started-games/02-asteroids/game.js`
   - Recibir `canvas` como parámetro; obtener `ctx` de él
   - Encapsular todo el estado dentro de `startGame`
   - Firma exportada:
     ```ts
     export function startGame(
       canvas: HTMLCanvasElement,
       onStateChange?: (state: { score: number; lives: number; level: number }) => void
     ): { cleanup: () => void; setPaused: (p: boolean) => void }
     ```
   - `onStateChange` se llama solo cuando score/lives/level cambian (no cada frame)
   - `setPaused(true)` congela el loop sin cancelar el RAF; `lastTime` se resetea
     al despausar para evitar spike de `dt`
   - `e.preventDefault()` en keydown para `ArrowLeft/Right/Up/Down/Space`
   - `cleanup` cancela RAF y remueve ambos event listeners

2. **Componente cliente** (`app/games/asteroids/AsteroidsGame.tsx`)
   - `'use client'` — usa `useRef`, `useState`, `useEffect`
   - `useState` para `score`, `lives`, `level`, `paused`
   - `useRef` para guardar `setPaused` del juego (no re-ejecuta el effect)
   - `useEffect` llama `startGame(canvasRef.current, callback)` y retorna `cleanup`
   - Estructura visual (igual que los demás juegos de la plataforma):
     ```
     .av-player.fade-in
       .player-hud                        ← HUD externo con stats + botones
         .hud-stat  (jugador / cyan)
         .hud-stat  (puntuación / cyan)
         .hud-stat.lives  (vidas / magenta ♥)
         .hud-stat.level  (nivel / yellow)
         .hud-actions
           <button .btn.yellow>  PAUSA / REANUDAR
           <Link .btn.ghost>     SALIR → /
       .crt
         .crt-screen
           <canvas width=800 height=600 style="width:100%;height:100%">
           overlay .crt-content (solo visible cuando paused)
         .crt-bottom  (LED verde + info técnica)
     ```

3. **Página** (`app/games/asteroids/page.tsx`)
   - Server Component sin wrapper extra — el `.av-player` del componente
     ya provee el layout y el padding correcto

4. **Verificación**
   - `tsc --noEmit` pasa sin errores
   - El juego arranca en `/games/asteroids`, responde a teclado
   - HUD externo muestra score/nivel/vidas y se actualiza en tiempo real
   - PAUSA congela el juego y muestra overlay; REANUDAR lo retoma
   - Flechas no causan scroll de la página

---

## Acceptance criteria

- [x] `app/games/asteroids/game.ts` existe y exporta únicamente `startGame`
- [x] `startGame` recibe `HTMLCanvasElement` + callback opcional y devuelve `{ cleanup, setPaused }`
- [x] `cleanup` cancela el `requestAnimationFrame` loop
- [x] `cleanup` elimina los event listeners de teclado (`keydown`/`keyup`)
- [x] `AsteroidsGame.tsx` tiene `'use client'` y monta el canvas con `useEffect`
- [x] `page.tsx` existe como Server Component
- [x] La ruta `/games/asteroids` carga el juego sin errores de consola
- [x] El juego responde a `ArrowLeft`, `ArrowRight`, `ArrowUp` y `Space`
- [x] Las flechas no causan scroll de la página (`preventDefault`)
- [x] HUD externo muestra jugador, score, vidas (♥) y nivel actualizados en tiempo real
- [x] El canvas está envuelto en `.crt` / `.crt-screen` (bordes redondeados + brillo cyan)
- [x] Botón PAUSA congela el loop; REANUDAR lo retoma sin spike de dt
- [x] Al desmontar no quedan listeners ni loops activos (sin memory leaks)
- [x] `tsc --noEmit` pasa sin errores
- [x] Las rutas existentes de la plataforma no se ven afectadas

---

## Decisions

- **`startGame` devuelve objeto en lugar de función** — se necesita exponer tanto
  `cleanup` como `setPaused`. El HUD externo requiere comunicación bidireccional:
  React controla pausa, el juego notifica estado.

- **`onStateChange` con diff** — el callback solo se dispara cuando score/lives/level
  cambian (comparación con valores previos), evitando 60 re-renders por segundo.

- **HUD externo en lugar de canvas-interno** — los demás juegos de la plataforma usan
  `.player-hud` con clases CSS del design system (`.hud-stat`, `.hud-stat.lives`,
  `.hud-stat.level`). Para consistencia visual se migró el HUD al DOM.
  El HUD interno del canvas se conserva como fallback visual durante gameplay.

- **`.crt` / `.crt-screen` para el canvas** — clases ya definidas en `globals.css`
  que dan bordes redondeados (`border-radius: 12px/28px`), brillo cyan en la sombra
  y efecto de scanlines. El canvas usa `style="width:100%;height:100%"` para
  llenar la pantalla CRT manteniendo las coordenadas lógicas 800×600.

- **`lastTime = null` al pausar** — evita que al reanudar el `dt` acumule todo el
  tiempo pausado y cause un salto de física.

- **`page.tsx` sin wrapper** — `.av-player` dentro del componente ya tiene
  `max-width: 1100px; margin: 32px auto; padding: 0 24px 64px`, consistente
  con el resto de páginas de juego.

---

## Lecciones para futuros juegos

Al escribir el spec de un juego nuevo, incluir explícitamente:

```md
**Referencia de UI:** seguir la estructura de `app/player/[id]/page.tsx` y el
patrón ya establecido en `app/games/asteroids/AsteroidsGame.tsx`:
- Wrapper `.av-player.fade-in`
- HUD externo `.player-hud` con score/vidas/nivel + botones PAUSA/SALIR
- Canvas envuelto en `.crt` > `.crt-screen` (con `.crt-bottom`)
- `startGame` expone estado vía `onStateChange` y control vía `setPaused`
```

Sin esta referencia el agente implementa el HUD dentro del canvas (más simple)
en lugar de usar el design system de la plataforma.
