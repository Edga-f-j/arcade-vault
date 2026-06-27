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
| `/auth/reset` | `app/auth/reset/page.tsx` | Password recovery |
| `/salon` | `app/salon/page.tsx` + `SalonTabs.tsx` | Hall of Fame — leaderboard tabs per game |
| `/about` | `app/about/page.tsx` | About + contact form (Resend) |

### Games (`app/games/`)

Each game has its own folder: `page.tsx`, `<Name>Game.tsx` (client component), `game.ts` (pure logic), and `skins.ts` (per-game palettes; see Shared code).

| Game | Route | Notes |
|---|---|---|
| Tetris | `/games/tetris` | Falling block puzzle; no `skins.ts` yet |
| Asteroids | `/games/asteroids` | Space shooter |
| Snake | `/games/snake` | Grid-based snake; sprite atlas in `public/` |
| Arkanoid | `/games/arkanoid` | Brick breaker; `levels.ts` + `spritesheet.ts` |
| Frogger | `/games/frogger` | Road/river crossing; play screen at `play/page.tsx` |

Full list & metadata in `references/implemented-games.md`.

### Shared code

- `app/_components/Nav.tsx` — global nav (logo, links, auth button, mobile hamburger)
- `app/_context/AuthContext.tsx` — auth state via React Context + localStorage (`av_user` key)
- `lib/data.ts` — `GAMES` array, player names, `seededScores()` for deterministic demo data
- `lib/supabase/client.ts` — browser Supabase client (typed with `Database`)
- `lib/supabase/server.ts` — server-side Supabase client
- `types/database.ts` — auto-generated Supabase types
- `app/about/actions.ts` — `sendContact()` Server Action (Resend email)
- `app/games/<slug>/skins.ts` — per-game palettes (`classic`/`retro`/`neon`) consumed via a `skinRef`; logic in `game.ts` stays palette-free. Coverage tracked in `references/game-with-themes.md`.

### Supabase schema

| Table | Key columns |
|---|---|
| `games` | `id`, `name`, `slug`, `description`, `route`, `image_url` |
| `scores` | `id`, `player_name`, `score`, `game_slug` (→ `games.slug`), `user_id` (→ `auth.users`), `created_at` |
| `profiles` | `id` (→ `auth.users`), display name; auto-created by trigger on signup |

**Schema changes go through versioned migrations in `supabase/migrations/`** — never edit the schema ad hoc.

Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `RESEND_API_KEY`, `CONTACT_EMAIL`.

### Styling

- Tailwind CSS v4 via `@tailwindcss/postcss`; config in `app/globals.css`
- Fonts: **Press Start 2P** (pixel), Courier Prime, JetBrains Mono (Google Fonts)
- CSS custom properties: `--cyan`, `--magenta`, `--yellow`, `--green`, etc. for neon arcade palette


## Spec-Driven Development

Specs live in `specs/` (`01`–`13` implemented). Each spec file maps to a branch and PR.
Themed game roadmaps live under `specs/game-jam/<slug>/` (spec variants to choose from).


## Skills

- **Local** (`.claude/skills/`):
  - `add-game` — generates `specs/NN-<slug>.md` for a new canvas game (pure `game.ts`, React component, `games` row, leaderboard wiring). Specs only.
  - `spec-impl-game` — implements an approved game spec, then chains `skin-designer` + `mobile-porter` over it.
- **External** (`npx skills@latest add Klerith/fernando-skills`): `/spec`, `/spec-impl` — general spec-driven flow.


## Agents

Definitions in `.claude/Agents/`. Each works one game at a time and applies changes directly (except where noted).

| Agent | What it does |
|---|---|
| `game-planner` | Picks the next game that fits the catalog; tracks suggestions in `references/game-suggestions-todo.md`. Produces a ficha for `/add-game`. **Specs/proposal only.** |
| `game-jam` | From a **theme**, designs one game and writes 2 alternative spec variants in `specs/game-jam/<slug>/` to choose from. **Specs only.** |
| `skin-designer` | Applies the 3 canonical skins (`classic`/`retro`/`neon`) to one game via `skins.ts` + `skinRef`; logs progress in `references/game-with-themes.md`. |
| `mobile-porter` | Audits & fixes mobile responsiveness of one game against the SPEC 11 touch-controls pattern. |
