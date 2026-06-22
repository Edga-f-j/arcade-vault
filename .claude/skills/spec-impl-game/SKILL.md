---
name: spec-impl-game
description: Implementa una spec de JUEGO aprobada (mismo flujo que spec-impl) y, al terminar la implementación, encadena automáticamente el agente skin-designer y luego el mobile-porter sobre el juego implementado (uno tras otro, nunca en paralelo).
disable-model-invocation: true
argument-hint: <NN-spec-name>
allowed-tools: Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(cat:*), Bash(ls:*), Agent
---

# /spec-impl-game — Implementador de specs de juego con skins + móvil encadenados

Este comando hace **exactamente lo mismo que `/spec-impl`** (implementa una spec aprobada paso
a paso) y, cuando la implementación termina, **encadena dos agentes automáticamente**, uno
después del otro (nunca en paralelo):

1. `skin-designer` — aplica los 3 skins canónicos (`classic`, `retro`, `neon`) al juego.
2. `mobile-porter` — audita y corrige la responsividad móvil del juego.

Úsalo cuando implementes la spec de un **juego nuevo** y quieras dejarlo de una vez con skins
y revisado en móvil.

## Session context

Current repository state:
!`git status --short`

Current branch:
!`git branch --show-current`

Specs available in this folder:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist"`

---

## Instructions

Follow these five phases in strict order. **Do not advance to the next phase if the previous one did not complete correctly.**

---

### Phase 1 — Identify the spec

The received argument is: `$ARGUMENTS`

If `$ARGUMENTS` is empty:

- List the files available in `specs/` (you already have them above).
- Ask the user to specify the exact name of the spec.
- Stop and wait for an answer. Do not continue.

If `$ARGUMENTS` has a value:

- Look for the file in `specs/`. The user may have written the full name (`01-mvp-arkanoid`), only the number (`01`), or only the slug (`mvp-arkanoid`). Try to find the correct file in any of those cases.
- If you do not find the file, show the available specs and ask the user to correct the name.
- If you do find it, continue to Phase 2.

---

### Phase 2 — Validate the spec's state

Read the spec file you located in Phase 1 using the Read tool or `cat`.

In the file's contents, look for the line that contains the spec's state. The header label is typically `**Status:**` (English) or `**Estado:**` (Spanish), but it may use any language. Match by position (status line near the top of the spec) and by the surrounding state machine, not by the exact label.

**Absolute rule:** You can only continue if the state **means "Approved"** — regardless of the language used.

Treat any of the following (and their equivalents in other languages) as the **Approved** state and continue:

- English: `Approved`
- Spanish: `Aprobado`
- Portuguese: `Aprovado`
- French: `Approuvé`
- German: `Genehmigt`
- Italian: `Approvato`
- …or any other language's word that clearly means "approved"

Anything else (Draft / Borrador, In review / En revisión, Implemented / Implementado, Obsolete / Obsoleto, or any unrecognized value) means **stop** and show the error message below.

| State category                            | Examples (any language)                           | Action                                                                     |
| ----------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------- |
| Approved                                  | `Approved`, `Aprobado`, `Aprovado`, `Approuvé`, … | Continue to Phase 3.                                                       |
| Draft                                     | `Draft`, `Borrador`, …                            | Stop. Show the error message below.                                        |
| In review                                 | `In review`, `En revisión`, …                     | Stop. Show the error message below.                                        |
| Implemented                               | `Implemented`, `Implementado`, …                  | Stop. Show the error message below.                                        |
| Obsolete                                  | `Obsolete`, `Obsoleto`, …                         | Stop. Show the error message below.                                        |
| State line not found / unrecognized value | —                                                 | Stop. The file does not follow the expected format. Tell this to the user. |

If you are unsure whether a value means "approved", **do not assume**. Stop and ask the user to clarify or to update the spec to the canonical wording.

**Standard error message when the state does not mean Approved:**

```
❌ I cannot implement this spec.

Current state: [STATE FOUND]
I only work with specs whose state means "Approved" (e.g. `Approved`, `Aprobado`,
or the equivalent in another language).

To continue you have two options:
  1. If the spec is ready to be implemented, open it and change the state
     to "Approved" (or the equivalent term your team uses) manually.
     That change is made by the human, not the agent.
  2. If the spec still needs work, use /spec [name] to resume it.
```

Do not offer alternatives, do not suggest "I can still start if you want". The block is intentional.

---

### Phase 3 — Create the git branch and switch to it

Once you have confirmed the state means `Approved`:

1. Derive the branch name from the spec file's full name, without the extension. Format: `spec-NN-slug`. Examples:

   - `01-mvp-arkanoid.md` → branch `spec-01-mvp-arkanoid`
   - `02-powerups.md` → branch `spec-02-powerups`

2. Check whether the branch already exists:

   - If it **does not exist**: create it with `git checkout -b spec-NN-slug`.
   - If it **already exists**: inform the user that the branch already existed (it may mean previous work is being resumed).
   - In both cases: switch to the branch with `git checkout spec-NN-slug` and confirm the change was successful before continuing.

3. Visually confirm to the user that the branch was created and that you are on it:

   ```
   ✅ Ready to implement.

   Spec:   specs/NN-slug.md
   Branch: spec-NN-slug  (active)
   State:  Approved   (← echo back the actual value found in the spec)
   ```

4. **Do not start implementing yet.** First show the spec summary to the user so they have it fresh. Extract and show:
   - The **objective** (the line after `**Objective:**` / `**Objetivo:**` / equivalent label).
   - The **scope** (the `## Scope` / `## Alcance` / equivalent section).
   - The **implementation plan** (the section with the numbered steps — `## Implementation plan` / `## Plan de implementación` / equivalent).
   - The **acceptance criteria** (the checklist — `## Acceptance criteria` / `## Criterios de aceptación` / equivalent).

Match section headings by meaning, not by exact wording — the spec may be authored in any language.

---

### Phase 4 — Implement step by step

After showing the spec summary, tell the user:

```
I am going to implement the spec following the implementation plan exactly.
I will pause after each step so you can review the diff.

Shall we start with Step 1?
```

Wait for explicit confirmation ("yes", "go ahead", "go", or equivalent). Do not start without it.

Once confirmed, follow these rules during the entire implementation:

**One rule above all:** implement what the spec says. If something in the spec looks suboptimal to you, mention it as an observation but implement what was agreed. Changes to the spec go into the spec, not into the code by surprise.

**Work rhythm:**

- Implement one step of the plan.
- Show a summary of which files you touched and what you did.
- Say: `Step N completed. Could you review the diff and let me know if I continue with Step N+1?`
- Wait for confirmation before continuing.

**If during the implementation you find an ambiguity** the spec does not resolve:

- Stop.
- Describe the ambiguity exactly.
- Present two or three concrete options.
- Wait for the user's decision.
- Do not improvise.

**If the user asks for something that is out of the spec's scope:**

- Remind them that it is out of this spec's scope.
- Suggest noting it down for the next spec.
- Do not implement it on this branch.

**When the last step of the plan is implemented, do NOT close yet — continue to Phase 5.**

---

### Phase 5 — Chain the agents (skin-designer → mobile-porter)

This is what makes `/spec-impl-game` different from `/spec-impl`. It runs **only after the last
step of the Phase 4 plan is implemented**. The two agents run **automatically, in chain, one
after the other — never in parallel**.

1. **Derive the game slug.** The implemented spec is a game spec, so the slug is the game's slug
   (folder `app/games/<slug>`, route `/games/<slug>`, `game_slug === slug`). Get it from the spec
   name (`NN-mvp-<slug>` → `<slug>`) or from the spec body. State the detected slug in one line
   before launching:

   ```
   Juego detectado: <slug>. Encadenando skin-designer → mobile-porter...
   ```

2. **Launch `skin-designer` first.** Call the `Agent` tool with `subagent_type: skin-designer`,
   passing the game slug explicitly in the prompt (e.g. "Aplica los 3 skins canónicos al juego
   `<slug>`."). **Wait for it to finish** and relay its report to the user.

3. **Only after skin-designer finishes, launch `mobile-porter`.** Call the `Agent` tool with
   `subagent_type: mobile-porter` and the same slug (e.g. "Revisa y corrige la responsividad
   móvil del juego `<slug>`."). Relay its report.

   **Critical:** the two `Agent` calls must be in **separate** tool-use blocks, sequential. Never
   put both in the same block (that would run them in parallel).

4. **Final close** to the user:

   ```
   ✅ Implementación de la spec completada.

   Encadenando agentes sobre el juego «<slug>»:
     1/2 → skin-designer (skins classic/retro/neon)  — [resumen del reporte]
     2/2 → mobile-porter (responsividad móvil)        — [resumen del reporte]

   Siguiente: verifica los criterios de aceptación de la spec, corre `npx tsc --noEmit`,
   prueba en el celular y, si todo pasa, cambia el estado de la spec a "Implementado" y
   haz el commit final antes de fusionar la rama.
   ```

---

## Summary of expected behavior

```
/spec-impl-game 01-mvp-frogger

  Phase 1  →  Finds specs/01-mvp-frogger.md
  Phase 2  →  Reads the state → "Approved" / "Aprobado" → ✅ continues
  Phase 3  →  git checkout -b spec-01-mvp-frogger → shows objective/scope/plan/criteria
  Phase 4  →  Implements step by step with pauses
  Phase 5  →  Detects slug "frogger"
              → launches skin-designer (waits)
              → then launches mobile-porter (waits)
              → final summary + reminder to run npx tsc --noEmit

/spec-impl-game 02-powerups  (state: Draft / Borrador)

  Phase 1  →  Finds specs/02-powerups.md
  Phase 2  →  Reads the state → "Draft" → ❌ stops with standard error message
              Does not create branch, does not touch code, does not launch agents
```
