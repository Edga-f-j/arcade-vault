# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — an online gaming platform where users play and compete for points. Uses **Next.js 16.2.9** (App Router), React 19.2.4, TypeScript, and Tailwind CSS v4.


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

- `app/layout.tsx` — root layout with Geist fonts, Tailwind CSS globals
- `app/page.tsx` — home page (Server Component)
- `app/globals.css` — global styles (Tailwind v4 via `@tailwindcss/postcss`)
- `public/` — static assets served from `/`
- `next.config.ts` — Next.js config (TypeScript)

## Spec-Driven Development

This project follows Spec Driven Design using `/spec` and `/spec-impl` skills from:
```bash
npx skills@latest add Klerith/fernando-skills
```
