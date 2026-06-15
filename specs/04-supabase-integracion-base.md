# 04 — Supabase: Integración Base

> **Status:** Aprobado · **Depends on:** ninguno · **Date:** 2026-06-15
> **Objective:** Instalar y configurar Supabase en Arcade Vault con cliente
> browser (`createBrowserClient`), variables de entorno documentadas y tipos
> TypeScript generados desde el esquema del proyecto en `types/database.ts`.

---

## Scope

**In:**

- Instalar dependencias: `@supabase/supabase-js` y `@supabase/ssr`
- `lib/supabase/client.ts` — cliente browser con `createBrowserClient`
- Variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  documentadas en `.env.template` y con placeholders en `.env.local`
- `types/database.ts` — tipos TypeScript generados desde el esquema del proyecto
  en Supabase Cloud vía MCP

**Out of scope:**

- Cliente servidor (`createServerClient`) — queda para el spec de auth o BD
- `proxy.ts` (refresco de sesión) — queda para el spec de auth
- Tablas, migraciones o esquema de BD — queda para specs posteriores
- Autenticación (registro, login, sesión)
- Cualquier cambio a páginas o rutas existentes

---

## Data model

Este spec no introduce estructuras de datos persistentes ni tablas en la BD.
El único artefacto de datos es `types/database.ts`, generado automáticamente
desde el esquema de Supabase Cloud — refleja el estado actual del proyecto
(puede estar vacío si no hay tablas todavía). Se regenera en futuros specs
cuando se añadan tablas.

---

## Implementation plan

1. **Instalar dependencias**
   - `npm install @supabase/supabase-js @supabase/ssr`

2. **Variables de entorno**
   - Añadir a `.env.template`:
     ```
     NEXT_PUBLIC_SUPABASE_URL=
     NEXT_PUBLIC_SUPABASE_ANON_KEY=
     ```
   - Crear `.env.local` con los mismos campos vacíos para que el usuario
     pegue sus valores reales (URL y anon key del proyecto Supabase)
   - Confirmar que `.env.local` está en `.gitignore`

3. **Cliente browser** (`lib/supabase/client.ts`)
   - Crear `lib/supabase/client.ts` exportando una función `createClient`
     que instancia `createBrowserClient` de `@supabase/ssr` usando las
     variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Tipar el cliente con `Database` de `types/database.ts`

4. **Tipos TypeScript** (`types/database.ts`)
   - Generar `types/database.ts` usando el MCP de Supabase
     (`generate_typescript_types`) contra el proyecto actual en Supabase Cloud
   - Si el esquema está vacío, el archivo se genera igualmente con la
     estructura base para que el tipado funcione en futuros specs

5. **Verificación**
   - `tsc --noEmit` pasa sin errores

---

## Acceptance criteria

- [ ] `@supabase/supabase-js` y `@supabase/ssr` aparecen en `package.json`
- [ ] `.env.template` documenta `NEXT_PUBLIC_SUPABASE_URL` y
      `NEXT_PUBLIC_SUPABASE_ANON_KEY` con campos vacíos
- [ ] `.env.local` existe con los mismos campos vacíos listos para pegar
      los valores reales
- [ ] `.env.local` está en `.gitignore`
- [ ] `lib/supabase/client.ts` exporta una función `createClient` que
      devuelve un cliente Supabase tipado con `Database`
- [ ] `types/database.ts` existe y exporta el tipo `Database`
- [ ] `tsc --noEmit` pasa sin errores
- [ ] Las rutas existentes (`/`, `/about`, `/biblioteca`, `/detalle`,
      `/player`, `/auth`, `/salon`) siguen funcionando sin cambios

---

## Decisions

- **`@supabase/ssr` en lugar de solo `@supabase/supabase-js`** — aunque en
  este spec solo se usa el cliente browser, `@supabase/ssr` es el paquete
  recomendado por Supabase para Next.js App Router. Instalar ambos ahora
  evita reinstalar cuando se añada el cliente servidor en el spec de auth.

- **`createBrowserClient` solo por ahora** — el cliente servidor
  (`createServerClient`) se añade en el spec de auth porque requiere
  `cookies()` async de Next.js 16 y aumenta la complejidad. Sin auth
  todavía, el cliente browser es suficiente.

- **`lib/supabase/client.ts` como función, no instancia singleton** —
  `createBrowserClient` de `@supabase/ssr` ya maneja internamente el
  singleton por tab; exportar una función en lugar de una instancia directa
  es el patrón oficial de Supabase para Next.js.

- **`types/database.ts` generado vía MCP ahora** — aunque el esquema pueda
  estar vacío, tener el archivo desde el inicio permite tipar el cliente
  desde el primer uso y evita añadir `any` temporal que luego hay que limpiar.

- **Variables con prefijo `NEXT_PUBLIC_`** — URL y anon key son seguras para
  exponer al cliente (son públicas por diseño en Supabase). Las claves
  secretas (service role key) nunca llevan `NEXT_PUBLIC_` y no se usan en
  este spec.
