---
name: add-game
description: Genera un spec para añadir un nuevo juego canvas a Arcade Vault (módulo game.ts puro, componente React, fila en la tabla games de Supabase y wiring del modal de leaderboard). Acepta una carpeta de references/templates/started-games/ o una descripción libre del juego. No escribe código; solo produce specs/NN-<slug>.md.
disable-model-invocation: true
argument-hint: '<carpeta references/templates/started-games/NN-name> o <descripción corta del juego>'
---

# add-game — Genera el spec de un nuevo juego para Arcade Vault

Esta skill produce el archivo de spec (`specs/<NN>-<slug>.md`) para integrar un juego nuevo
en la plataforma. **No escribe código** — la implementación queda para `/spec-impl`.

Sigue la misma filosofía y formato que la skill global `/spec`. Antes de hacer cualquier
otra cosa, leer ambos archivos de referencia:

1. `~/.claude/skills/spec/SKILL.md` — filosofía, fases y reglas del proceso
2. `~/.claude/skills/spec/template.md` — estructura exacta que debe seguir el spec

> Nota: estas rutas apuntan a la carpeta de skills **global** (`~/.claude/skills/`), no a la
> del repo (`.claude/skills/`). Confirma que es ahí donde realmente viven `spec/SKILL.md` y
> `spec/template.md` en tu setup, o ajusta las rutas si decides moverlos al repo para que
> viajen junto con el proyecto.

Aplicar ese proceso completo (fases 1–4), pero con las adaptaciones específicas de juego
que se describen a continuación.

---

## Adaptaciones específicas para juegos

### Fase 1 — Contexto del proyecto

Además de lo que indica `/spec`, leer:

- `specs/` — listar para determinar el número `<NN>` siguiente y ver convenciones
- Los dos specs más recientes — para mantener consistencia de estilo
- `app/games/asteroids/AsteroidsGame.tsx` — patrón canónico del componente
- `app/games/asteroids/game.ts` (primeras 60 líneas) — patrón canónico del módulo
- La definición actual de la tabla `games` en Supabase (vía MCP `list_tables` o
  `types/database.ts`). Si **no** tiene columnas para categoría/color de acento y
  `/biblioteca` muestra esos elementos visualmente en sus tarjetas, **detener** y
  preguntar al usuario cómo se va a resolver antes de seguir: (a) agregar esas
  columnas a `games` en un spec de migración aparte, o (b) derivarlas en el
  frontend con un mapa `slug → categoría/color`. No generar más specs de juego
  asumiendo que el tema ya está resuelto si nunca se confirmó explícitamente.

### Fase 1b — Detectar modo de entrada

Preguntar al usuario cuál de los dos modos aplica antes de pasar a las preguntas de clarificación:

**Modo A — Referencia vanilla JS**
El usuario pasa el nombre de una subcarpeta, p.ej. `03-tetris`.
Leer completo: `references/templates/started-games/<subcarpeta>/game.js`
Anotar internamente:
- Variables de estado (`score`, `lives`/`lines`/`balls`, `level`, condición game-over)
- Controles de teclado
- Tamaño original del canvas
- Assets externos (imágenes, sonidos) — marcar como fuera de scope

**Modo B — Descripción libre**
El usuario describe mecánica y controles en texto libre.
Usar esa descripción para diseñar el canvas desde cero.

### Fase 2 — Preguntas específicas para juegos

Hacer estas preguntas en bloques de 3-5, en el orden A → B → C → D. Esperar respuesta del
usuario antes de avanzar al siguiente bloque. Proponer siempre un valor recomendado basado
en `$ARGUMENTS` o en el modo detectado — no dejar preguntas completamente abiertas.

**Bloque A — Identidad del juego**

1. **slug** — PK en la tabla `games` y FK en `scores` (`game_slug`); también el segmento de
   URL (`/games/<slug>`). kebab-case, único. Proponer uno basado en `$ARGUMENTS` si es posible.
2. **name** — nombre para mostrar en la UI (ej. "Tetris").
3. **description** — 1-3 frases para la tarjeta y la página de detalle.
4. **image_url** — ¿hay portada disponible? Si no, queda `null` (nullable) y se añade después.
5. **Categoría y color de acento** — siguiendo lo que se resolvió en la Fase 1, pedir el
   valor concreto para este juego (ej. categoría `ARCADE`/`PUZZLE`/`SHOOTER` y color
   `cyan`/`magenta`/`yellow`/`green`). Si esto todavía no se resolvió a nivel de proyecto,
   no continuar — volver a la Fase 1.

**Bloque B — Mecánica**

1. **Canvas size** — ancho × alto en px. Si viene de Modo A, extraer de `index.html`;
   proponer 800×600 como valor por defecto si no hay referencia.
2. **Controles** — teclas o eventos. Si viene de Modo A, extraer de `game.js`.
3. **Estado HUD** — ¿qué valores expone el juego al HUD React? Opciones estándar:
   `score/lives/level`. Si el juego no tiene alguno, preguntar si se omite o se sustituye
   por otro campo (`lines`, `balls`, `time`, etc.). Documentar el HUD custom en el spec.
4. **Condición(es) de fin de partida** — ¿cuándo termina la partida? **¿Hay más de una
   condición de fin?** (ej. derrota por `lives === 0` Y victoria por completar niveles).
   Si hay más de una, el `onStateChange` debe incluir un campo explícito
   `status: 'playing' | 'gameover' | 'win' | ...` en vez de que React infiera el
   resultado a partir de `score`/`lives`/`level` — ver Fase 3, Data model.
5. **Pausa** — confirmar explícitamente que el game loop respeta `isPaused` y resetea
   `lastTime = null` al reanudar (patrón `AsteroidsGame`, evita el salto de física al
   despausar).

**Bloque C — Leaderboard**

Estos puntos tienen respuesta por defecto que el usuario puede cambiar:

1. **¿Se guarda el score al terminar?** — sí por defecto. Si no, el spec omite el modal de
   guardado.
2. **Top N del leaderboard** — 10 por defecto (como Asteroids).
3. **¿Aparece en `/salon` y en la home automáticamente?** — sí, por estar en `games`;
   mencionarlo como información, no como pregunta.

**Bloque D — Adaptación canvas → React** (solo si Modo A)

1. **Overlay "GAME OVER" del canvas** — ¿se elimina del `draw()` para que el modal React lo
   reemplace? (recomendado sí, patrón Asteroids). Confirmar explícitamente.
2. **HUD interno del canvas** — ¿se conserva sin cambios? (recomendado sí, doble HUD).
   Confirmar.
3. **Event listeners de teclado** — preguntar si el `game.js` original los añade a
   `document`/`window` globalmente o al canvas. Recordar que hay que limpiarlos en el
   `cleanup()` que devuelve `startGame`.
4. **Assets externos** (sonidos, sprites) — si los hay, marcar como fuera de alcance.

### Fase 3 — Secciones del spec con contenido específico de juego

Seguir el orden de `template.md`, sección a sección con confirmación del usuario.
El contenido de cada sección debe incluir los siguientes elementos específicos:

**Scope — siempre fuera:**
- Canvas responsivo (tamaño fijo 800×600)
- Autenticación (nombre solo por localStorage)
- Assets externos si los hay en la referencia
- Admin panel

**Data model — incluir siempre:**
```ts
type GameState = { score: number; <campo2>: number; level: number }
// condición de game-over: <descripción>
```
Si el juego tiene más de una condición de fin de partida (ver Bloque B, pregunta 4),
ampliar el tipo con un campo de estado explícito en lugar de inferir el resultado:
```ts
type GameState = {
  score: number; <campo2>: number; level: number
  status: 'playing' | 'gameover' | 'win'
}
```

Y la fila de Supabase:
```sql
INSERT INTO games (slug, name, description, image_url, route)
VALUES ('<slug>', '<name>', '<description>', <NULL o 'url'>, '/games/<slug>');
```
Si la tabla `games` ya tiene columnas de categoría/color (ver Fase 1), incluirlas también
en el INSERT con los valores confirmados en el Bloque A.

**Implementation plan — siempre estos pasos en este orden:**
1. `app/games/<slug>/game.ts` — módulo puro (sin imports React/Next/Supabase)
   - Modo A: transformaciones al `game.js` de referencia (DOM wiring a borrar, estado a encapsular, `notifyState()` con guard, `isPaused`+`lastTime=null`, `cleanup`)
   - Modo B: diseño del canvas desde cero (objetos, física, controles, `startGame` skeleton)
2. `app/games/<slug>/<PascalSlug>Game.tsx` — componente `'use client'` con HUD, modal nombre, score saving
3. `app/games/<slug>/page.tsx` — Server Component wrapper (sin lógica)
4. INSERT en tabla `games` de Supabase + verificación
5. `npx tsc --noEmit` + verificación manual de la ruta

**Acceptance criteria — ítems que no pueden faltar:**
- [ ] `game.ts` exporta únicamente `startGame` y no importa React/Next/Supabase
- [ ] `startGame` devuelve `{ cleanup, setPaused }`
- [ ] Modal de nombre aparece antes del canvas; pre-rellena desde `localStorage` si existe
- [ ] Score se inserta una sola vez (guard `scoreSaved.current`)
- [ ] Si hay más de una condición de fin, cada una dispara su modal correcto según `status`
      y el score se guarda en ambos casos
- [ ] `/biblioteca` muestra la tarjeta del nuevo juego
- [ ] `npx tsc --noEmit` pasa sin errores

**Decisions — capturar siempre:**
- `game.ts` sin imports externos (portabilidad y testabilidad)
- `notifyState()` con guard de valores previos (evita 60 re-renders/seg)
- `lastTime = null` en rama paused (evita spike de dt al reanudar)
- `scoreSaved` ref en lugar de estado (evita race condition game-over + SALIR)
- `game_slug` igual al `slug` de `games` (requisito de la FK)
- Si aplica: `onStateChange` incluye campo `status` (justificar por qué `score`/`lives`/
  `level` por sí solos no bastan para distinguir el resultado)

### Fase 4 — Guardar el spec

Seguir exactamente las reglas de `/spec`:
- Nombre: `specs/<NN>-<slug>.md`
- Estado inicial: `Draft` (nunca `Approved` automáticamente)
- Confirmar al usuario: ruta del archivo, estado Draft, y que el siguiente paso es `/spec-impl <NN>-<slug>`
- **Detenerse aquí.** No proponer implementación ni escribir código.

---

## Invariantes que el spec debe respetar (verificar antes de guardar)

- `game.ts` sin imports de React, Next.js ni Supabase
- Contrato `startGame(canvas, onStateChange?)` → `{ cleanup, setPaused }`
- `notifyState()` con guard de valores previos mencionado en el plan
- `lastTime = null` en rama paused del loop mencionado en el plan
- `scoreSaved` ref para evitar doble insert mencionado en el plan
- `game_slug` coincide exactamente con el `slug` de la tabla `games`
- Ruta `/games/<slug>` — no `/games` ni `/leaderboard`
- Si el juego tiene más de una condición de fin de partida, `onStateChange` incluye un
  campo `status` explícito (`'playing' | 'gameover' | 'win' | ...`) — nunca se infiere
  el resultado solo a partir de `score`/`lives`/`level`
- Ninguna sección del spec se duplica en otra parte del documento (ej. una lista de
  "fuera de alcance" no se repite en una sección adicional al final) — cada tipo de
  contenido vive en una sola sección
- No hay código de implementación en el spec — solo descripción y pseudocódigo de estructura
