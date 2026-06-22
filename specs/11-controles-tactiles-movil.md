# SPEC 11 — Controles táctiles para móvil

> **Status:** Implementado · **Depends on:** 05-juego-asteroids, 07-juego-tetris, 08-arkanoid, 09-juego-snake · **Date:** 2026-06-21
> **Objective:** Añadir un gamepad virtual unificado (D-pad + botones A/B) que aparece automáticamente en pantallas táctiles y permite jugar los 4 juegos en móvil, mapeando cada acción al mismo esquema de botones vía una nueva API `sendInput` del motor.

---

## Scope

**In:**

- Componente compartido `app/games/_components/TouchGamepad.tsx` (`'use client'`) — D-pad de 4 direcciones (izq) + botones de acción A/B (der), overlay semitransparente abajo del canvas.
- Se muestra **solo en punteros táctiles** vía media query `(pointer: coarse)` — invisible en desktop, no afecta el juego con teclado.
- Cada `game.ts` extiende el objeto devuelto por `startGame` con `sendInput(button, pressed)`; mapea D-pad/A/B al mismo estado interno que ya usan los handlers de teclado.
- `button`: `'up' | 'down' | 'left' | 'right' | 'a' | 'b'`. `pressed`: `boolean` (down/up para juegos con teclas sostenidas; solo `pressed===true` cuenta para juegos discretos).
- Mapeo por juego (según tabla acordada):
  - **Snake** — D-pad = 4 direcciones; A/B sin uso.
  - **Tetris** — ↑ rotar, ↓ bajar, ←/→ mover, A drop; B sin uso.
  - **Arkanoid** — ←/→ paddle, A lanzar; resto sin uso.
  - **Asteroids** — ↑ empuje, ↓ hiperespacio, ←/→ rotar, A disparar; B sin uso.
- Integración en los 4 `<Name>Game.tsx`: renderizar `<TouchGamepad onInput={...} mapping={...} />` dentro de `.crt`, debajo del canvas.
- Polish responsive mínimo: el HUD (`.player-hud`) hace wrap correcto y el gamepad no tapa stats en pantallas chicas.

**Out of scope (para specs futuros):**

- Gestos (swipe/drag/tap en canvas) — solo botones.
- Botones de PAUSA/FIN/SALIR dentro del gamepad — quedan solo en el HUD superior.
- Botón B con función real en algún juego — reservado, sin acción.
- Vibración háptica (`navigator.vibrate`).
- Rediseño del canvas o cambio de su aspect-ratio (ya es responsive).
- Toggle manual para mostrar/ocultar el gamepad — es automático por `pointer: coarse`.
- Layout landscape dedicado (gamepad a los lados).

---

## Data model

No introduce estructuras de datos persistentes nuevas (nada en localStorage ni Supabase). Solo tipos de la API de input y props del componente.

```ts
// Botones físicos del gamepad unificado (mismos en los 4 juegos)
type GamepadButton = 'up' | 'down' | 'left' | 'right' | 'a' | 'b'

// Nueva función expuesta por el motor; press/release.
// Juegos discretos (Snake, Tetris) ignoran pressed === false.
type SendInput = (button: GamepadButton, pressed: boolean) => void

// Objeto devuelto por startGame en los 4 juegos (extiende el actual)
type GameHandle = {
  cleanup: () => void
  setPaused: (p: boolean) => void
  sendInput: SendInput   // ← nuevo
}

// Mapeo declarativo por juego: qué botones usa y qué etiqueta muestran A/B.
// Botones no usados se renderizan deshabilitados/atenuados (no se ocultan,
// para que el layout sea idéntico en los 4 juegos).
type GamepadMapping = {
  used: GamepadButton[]              // botones activos en este juego
  labels?: Partial<Record<'a' | 'b', string>>  // ej. { a: 'DROP' }, { a: 'FUEGO' }
}

// Props de TouchGamepad
type TouchGamepadProps = {
  onInput: SendInput
  mapping: GamepadMapping
}
```

Convención de mapeos (definidos inline en cada `<Name>Game.tsx`):

```ts
// Snake
{ used: ['up','down','left','right'] }
// Tetris
{ used: ['up','down','left','right','a'], labels: { a: 'DROP' } }
// Arkanoid
{ used: ['left','right','a'], labels: { a: 'LANZAR' } }
// Asteroids
{ used: ['up','down','left','right','a'], labels: { a: 'FUEGO' } }
```

---

## Implementation plan

1. **`app/games/_components/TouchGamepad.tsx`** — componente `'use client'`.
   - Renderiza wrapper con `className="touch-gamepad"` (oculto por defecto vía CSS; visible solo en `(pointer: coarse)`).
   - D-pad: 4 botones (↑↓←→) en cruz. Acciones: A/B a la derecha.
   - Cada botón llama `onInput(button, true)` en `onPointerDown` y `onInput(button, false)` en `onPointerUp`/`onPointerLeave`/`onPointerCancel`.
   - `e.preventDefault()` en `onPointerDown` para evitar scroll/zoom/selección.
   - Botones fuera de `mapping.used` se renderizan con `disabled` y atenuados; etiquetas A/B desde `mapping.labels`.
   - Test manual: renderizar en una página, ver el d-pad solo en DevTools modo táctil; los clicks loguean `onInput`.

2. **Estilos en `app/globals.css`** — bloque `.touch-gamepad`.
   - `display: none` por defecto; `@media (pointer: coarse) { .touch-gamepad { display: flex } }`.
   - Overlay semitransparente abajo del canvas: `justify-content: space-between`, padding, `touch-action: none`, `user-select: none`.
   - Botones grandes (mín. 56×56px), neón, `:active` resalta. D-pad en cruz (grid 3×3), A/B redondos.
   - Ajuste `@media (max-width: 720px)` para que `.player-hud` haga wrap limpio.

3. **`app/games/snake/game.ts`** — añadir `sendInput` al retorno.
   - Extraer la lógica del handler `keydown` a un mapa `applyDirection(dir)`; `sendInput` mapea `up/down/left/right` → misma actualización de `nextDir` (con bloqueo de 180°). A/B no-op.
   - Devolver `{ cleanup, setPaused, sendInput }`.
   - Test: `tsc --noEmit` pasa; teclado sigue funcionando.

4. **`app/games/snake/SnakeGame.tsx`** — integrar gamepad.
   - Guardar `sendInput` en `sendInputRef` desde el retorno de `startGame`.
   - Renderizar `<TouchGamepad onInput={(b,p)=>sendInputRef.current?.(b,p)} mapping={{used:['up','down','left','right']}} />` dentro de `.crt`, tras `.crt-screen`.

5. **`app/games/tetris/game.ts` + `TetrisGame.tsx`** — igual patrón.
   - `sendInput`: ↑ rotar, ↓ soft-drop, ←/→ mover, A hard-drop. Mapear a las mismas funciones internas que usa el teclado.
   - Mapping `{ used: ['up','down','left','right','a'], labels: { a: 'DROP' } }`.

6. **`app/games/arkanoid/game.ts` + `ArkanoidGame.tsx`** — teclas sostenidas.
   - `sendInput('left'|'right', pressed)` activa/desactiva el flag de movimiento del paddle (mismo flag que `keydown`/`keyup`). A lanza la bola.
   - Mapping `{ used: ['left','right','a'], labels: { a: 'LANZAR' } }`.

7. **`app/games/asteroids/game.ts` + `AsteroidsGame.tsx`** — teclas sostenidas.
   - `sendInput`: ←/→ rotar (held), ↑ empuje (held), ↓ hiperespacio (momentáneo en `pressed===true`), A disparar.
   - Mapping `{ used: ['up','down','left','right','a'], labels: { a: 'FUEGO' } }`.

8. **Verificación final** (sección de criterios).
   - `npx tsc --noEmit` limpio; los 4 juegos jugables con teclado (sin regresión) y con gamepad en modo táctil.

---

## Acceptance criteria

- [ ] `app/games/_components/TouchGamepad.tsx` existe y exporta el componente.
- [ ] El gamepad está oculto (`display:none`) en punteros finos (mouse) y visible bajo `@media (pointer: coarse)`.
- [ ] En desktop con teclado, los 4 juegos funcionan exactamente igual que antes (sin regresión).
- [ ] `startGame` de los 4 juegos devuelve `{ cleanup, setPaused, sendInput }`.
- [ ] `sendInput(button, pressed)` acepta `'up'|'down'|'left'|'right'|'a'|'b'`.
- [ ] Botones fuera de `mapping.used` se renderizan deshabilitados/atenuados, no se ocultan (layout idéntico en los 4 juegos).
- [ ] **Snake** (táctil): D-pad mueve la serpiente en las 4 direcciones; giro 180° bloqueado igual que con teclado.
- [ ] **Tetris** (táctil): ←/→ mueve, ↑ rota, ↓ baja, A hace drop.
- [ ] **Arkanoid** (táctil): mantener ←/→ mueve el paddle de forma continua; soltar lo detiene; A lanza la bola.
- [ ] **Asteroids** (táctil): mantener ↑ aplica empuje continuo; mantener ←/→ rota continuo; soltar detiene; ↓ activa hiperespacio; A dispara.
- [ ] Soltar el dedo fuera del botón (`pointerleave`/`pointercancel`) libera la tecla sostenida (no se queda "pegada").
- [ ] `onPointerDown` llama `preventDefault()`: tocar el gamepad no hace scroll, zoom ni selecciona texto.
- [ ] El gamepad no tapa el HUD ni el canvas; el HUD hace wrap limpio en pantallas ≤720px.
- [ ] PAUSA/FIN/SALIR siguen solo en el HUD superior (no se duplican en el gamepad).
- [ ] El botón B no tiene acción en ningún juego (reservado).
- [ ] `npx tsc --noEmit` pasa sin errores.
- [ ] Las rutas existentes de la plataforma no se ven afectadas.

---

## Decisions

- **Botones overlay React, no gestos** — explícito y uniforme en los 4 juegos; evita lógica de detección de swipe/drag distinta por juego y mantiene `game.ts` sin manejo de coordenadas táctiles.
- **`sendInput` en el objeto devuelto, no parámetro nuevo de `startGame`** — las firmas de `startGame` ya difieren entre juegos (skinRef, nextCanvas, onPauseToggle); extender el retorno `{cleanup, setPaused}` → `{cleanup, setPaused, sendInput}` es uniforme y no toca las listas de parámetros.
- **`sendInput` reusa el estado interno del teclado** — cada juego mapea botones a las mismas funciones/flags que ya usan los handlers `keydown`/`keyup`; no se duplica lógica de juego.
- **No un input genérico tipo "keyCode sintético"** — empujar eventos de teclado falsos sería frágil; una API explícita de botones es más clara y testeable.
- **`(pointer: coarse)` para mostrar/ocultar, no detección de user-agent ni toggle manual** — robusto, basado en capacidad real del dispositivo; desktop táctil también lo recibe, desktop con mouse no.
- **D-pad + A/B fijos en los 4 juegos, botones no usados atenuados** — "todos quedan iguales" (requisito del usuario); el layout no cambia entre juegos, solo qué botones están activos.
- **Botón B reservado sin acción** — deja espacio para una segunda acción futura (ej. bomba/escudo) sin rediseñar el gamepad.
- **No tocar el canvas/aspect-ratio** — ya es responsive (`aspect-ratio:4/3` + `width:100%`); el spec se concentra en input, no en re-escalado.
- **PAUSA/FIN/SALIR solo en HUD** — evita duplicar controles de sistema y libera espacio en el gamepad.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Tecla "pegada" si el dedo se desliza fuera del botón sin soltar | `onPointerLeave`/`onPointerCancel` además de `onPointerUp` liberan el botón (`pressed=false`). |
| Scroll/zoom de la página al tocar el gamepad | `touch-action: none` en el contenedor + `preventDefault()` en `pointerdown`. |
| Gamepad tapa parte del canvas en pantallas muy bajas (landscape) | Va debajo del canvas, no encima; landscape dedicado queda fuera de scope. |
| Regresión en teclado al refactorizar handlers a funciones compartidas | Criterio de aceptación exige que los 4 juegos sigan jugables con teclado sin cambios. |
| Desktop táctil (laptop con pantalla touch) muestra el gamepad junto al teclado | Aceptable: ambos inputs coexisten; `(pointer: coarse)` es la señal correcta de capacidad táctil. |

---

## What is **not** in this spec

- Gestos en canvas (swipe/drag/tap) — otro spec si llega.
- Botón B con acción real.
- PAUSA/FIN/SALIR dentro del gamepad.
- Vibración háptica.
- Layout landscape dedicado.
- Cambios al canvas o su aspect-ratio (ya es responsive).

Cada uno, si llega, va en su propio spec.
