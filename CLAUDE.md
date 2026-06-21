# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — an online gaming platform where users play and compete for points. Uses **Next.js 16.2.9** (App Router), React 19.2.4, TypeScript, and Tailwind CSS v4.

Stack: `@supabase/supabase-js` + `@supabase/ssr` (database & auth), `resend` (email), Turbopack (default bundler).


## Next.js 16 Breaking Changes

**Before writing any Next.js code, read `node_modules/next/dist/docs/` for the relevant API.** Key differences from prior versions:

- **`params` and `searchParams` are Promises** — always `await` them in layouts, pages, route handlers, and metadata files.
  ```tsx
  export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
  }
  ```
- **`cookies()`, `headers()`, `draftMode()` are async-only** — no synchronous access.
- **`next lint` is removed** — use `eslint` / `eslint --fix` directly. `next build` no longer runs linting.
- **`middleware.ts` → `proxy.ts`** — rename the file and the named export from `middleware` to `proxy`. Edge runtime is not supported in `proxy`.
- **Parallel routes require `default.js`** — builds fail without explicit `default.js` in every `@slot`.
- **Turbopack is the default bundler** for both `next dev` and `next build`. No `--turbopack` flag needed. Use `--webpack` to opt out.
- **`revalidateTag` requires a second argument** (cacheLife profile, e.g. `'max'`). For immediate updates use `updateTag` in Server Actions instead.
- **`cacheLife`/`cacheTag`** no longer need the `unstable_` prefix.
- **PPR** is now enabled via `cacheComponents: true` in `next.config.ts` (not `experimental.ppr`).
- **`serverRuntimeConfig`/`publicRuntimeConfig` removed** — use `process.env` directly on the server; prefix client-accessible vars with `NEXT_PUBLIC_`.
- **`images.domains` deprecated** — use `images.remotePatterns`.
- **`next/legacy/image` deprecated** — use `next/image`.
- **AMP fully removed.**


## Architecture

Uses the **App Router** (`app/` directory). All layouts and pages are Server Components by default — add `'use client'` only for components that need interactivity or browser APIs.

### Routes

| Route | File | Description |
|---|---|---|
| `/` | `app/page.tsx` + `HomeClient.tsx` | Home — top scores, feature icons, scroll animations |
| `/biblioteca` | `app/biblioteca/page.tsx` + `BibliotecaCatalog.tsx` | Game catalog with search and 3D card tilt |
| `/detalle/[id]` | `app/detalle/[id]/page.tsx` | Game detail + per-game leaderboard |
| `/player/[id]` | `app/player/[id]/page.tsx` | In-game HUD (score, level, lives, pause) |
| `/auth` | `app/auth/page.tsx` | Login / signup tabs |
| `/salon` | `app/salon/page.tsx` + `SalonTabs.tsx` | Hall of Fame — leaderboard tabs per game |
| `/about` | `app/about/page.tsx` | About + contact form (Resend) |

### Games (`app/games/`)

Each game has its own folder: `page.tsx`, `<Name>Game.tsx` (client component), `game.ts` (pure logic).

| Game | Route | Notes |
|---|---|---|
| Tetris | `/games/tetris` | Falling block puzzle |
| Asteroids | `/games/asteroids` | Space shooter |
| Snake | `/games/snake` | Grid-based snake; sprite atlas in `public/` |
| Arkanoid | `/games/arkanoid` | Brick breaker; `levels.ts` + `spritesheet.ts` |
| and more... see C:\Users\edgar\Dev\ClaudeCode\05-arcade-vault\references\implemented-games.md

### Shared code

- `app/_components/Nav.tsx` — global nav (logo, links, auth button, mobile hamburger)
- `app/_context/AuthContext.tsx` — auth state via React Context + localStorage (`av_user` key)
- `lib/data.ts` — `GAMES` array, player names, `seededScores()` for deterministic demo data
- `lib/supabase/client.ts` — browser Supabase client (typed with `Database`)
- `lib/supabase/server.ts` — server-side Supabase client
- `types/database.ts` — auto-generated Supabase types
- `app/about/actions.ts` — `sendContact()` Server Action (Resend email)

### Supabase schema

| Table | Key columns |
|---|---|
| `games` | `id`, `name`, `slug`, `description`, `route`, `image_url` |
| `scores` | `id`, `player_name`, `score`, `game_slug` (→ `games.slug`), `created_at` |

Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `RESEND_API_KEY`, `CONTACT_EMAIL`.

### Styling

- Tailwind CSS v4 via `@tailwindcss/postcss`; config in `app/globals.css`
- Fonts: **Press Start 2P** (pixel), Courier Prime, JetBrains Mono (Google Fonts)
- CSS custom properties: `--cyan`, `--magenta`, `--yellow`, `--green`, etc. for neon arcade palette


## Spec-Driven Development

This project follows Spec Driven Design using `/spec` and `/spec-impl` skills from:
```bash
npx skills@latest add Klerith/fernando-skills
```

Specs live in `specs/` (01–10 implemented so far). Each spec file maps to a branch and PR.


## Agents

### `game-planner` (`.claude/Agents/game-planner.md`)

Curates the game catalog. Reads `references/implemented-games.md` (implemented) and
`references/game-suggestions-todo.md` (previously suggested) to avoid repeats, then
proposes one new game with a full `add-game`-ready spec sheet and appends it to the
To-Do file as persistent memory.

**When to use:** before starting a new game, invoke this agent to get a justified
recommendation and a ready-to-use ficha. Then run `/add-game <slug>` to generate the spec.

### `game-jam` (`.claude/Agents/game-jam.md`)

Takes a **theme** (e.g. "deep ocean", "food", "retro horror") and designs **one** game that
fits it, then generates a series of **incremental specs** (min 2, target 3) in
`specs/game-jam/<slug>/` — `01-mvp-<slug>.md` plus enhancements, each chained via `Depends on`.
Each spec follows the format of the approved specs (`07`/`08`/`09`) and the `add-game`
invariants (pure `game.ts`, `startGame` contract, `scoreSaved` ref, `game_slug === slug`).
Reads `references/implemented-games.md` and `references/game-suggestions-todo.md` to avoid
repeats and appends the chosen game to the To-Do file as persistent memory. Writes specs only —
never game code.

**When to use:** to spin up a full incremental spec roadmap for a new themed game in one shot.
Specs start as `Draft`; review them, then run `/spec-impl <ruta>` for each in order (MVP first).
