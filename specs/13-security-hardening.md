# SPEC 13 — Hardening de seguridad (RLS, Auth, headers)

> **Status:** implementado · **Depends on:** 12-auth-supabase · **Date:** 2026-06-26
> **Objective:** Cerrar los hallazgos del checklist de seguridad — restringir el INSERT permisivo en `scores`, revocar `EXECUTE` de las funciones `SECURITY DEFINER`, añadir headers de seguridad en Next.js, validar contraseña robusta en el registro, y documentar los ajustes de Auth del dashboard (min password, leaked password protection, signup rate).

---

## Scope

**In:**

- **Migración Supabase — policy `scores`**: reemplazar `public insert scores` (`WITH CHECK (true)`, rol `public`) por una policy de INSERT restringida al rol `authenticated` con `WITH CHECK (auth.uid() = user_id)`. Cierra el hallazgo `rls_policy_always_true`.
- **Migración Supabase — revocar EXECUTE**: `REVOKE EXECUTE` sobre `public.handle_new_user()` y `public.rls_auto_enable()` de los roles `anon`, `authenticated` y `public`. Ambas son funciones de trigger / event-trigger; ningún cliente las llama directamente. Cierra los hallazgos `anon_security_definer_function_executable` y `authenticated_security_definer_function_executable`.
- **`next.config.ts`**: añadir `headers()` con los 4 headers de seguridad (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-DNS-Prefetch-Control: off`) aplicados a `/(.*)`.
- **`app/auth/page.tsx`**: validación client-side de contraseña robusta en el tab de registro (longitud mínima 8 + mayúscula + minúscula + número + símbolo), mostrando error inline antes de llamar a `supabase.auth.signUp`.
- **Pasos manuales en Supabase Dashboard** (documentados, sin código): activar min password length = 8, leaked password protection (HaveIBeenPwned), y max signup rate por IP.

**Out of scope:**

- Habilitar RLS en `games` / `scores` — **ya está habilitado** en las tres tablas (`games`, `profiles`, `scores`); el spec solo lo verifica.
- Cambiar la policy de SELECT público en `games`, `scores` y `profiles` — el acceso de lectura público es intencional (leaderboard).
- Content-Security-Policy y HSTS — diferido (riesgo con inline styles/scripts de Next y consecuencias irreversibles de HSTS).
- Cambios al código de los 4 juegos — ya insertan `user_id` y `player_name` correctamente; la nueva policy funciona sin tocarlos.
- Aplicar los ajustes de Auth vía Management API o automatización — se hacen a mano en el dashboard.
- Verificación de email, rutas protegidas, edición de perfil — fuera de este spec (los cubre o difiere el spec 12).

---

## Cambios de base de datos (sin nuevo esquema)

No se introducen tablas ni columnas nuevas. Solo cambian políticas y permisos existentes.

### Policy de INSERT en `scores`

```sql
-- Reemplaza la policy permisiva existente
DROP POLICY IF EXISTS "public insert scores" ON public.scores;

CREATE POLICY "authenticated insert own scores"
  ON public.scores
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

Efecto: solo usuarios autenticados insertan, y `user_id` debe ser el suyo. Invitados (`anon`)
ya no pueden insertar — alineado con el spec 12 (los scores de invitado no se persisten).

### Revocar EXECUTE de funciones SECURITY DEFINER

```sql
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated, public;
```

Ambas se siguen ejecutando con normalidad: `handle_new_user` la dispara el trigger
`on_auth_user_created` (contexto del trigger, no del rol del cliente) y `rls_auto_enable`
es un event trigger DDL. Revocar `EXECUTE` solo elimina la superficie de ataque vía
`/rest/v1/rpc/*`.

Las policies de SELECT (`public read games`, `public read scores`, `profiles_select_public`)
y de UPDATE (`profiles_update_own`) **no se tocan**.

### Regex de contraseña (frontend)

```ts
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
```

Requisitos que valida:
- Al menos una letra minúscula
- Al menos una letra mayúscula
- Al menos un dígito
- Al menos un símbolo (cualquier carácter que no sea letra ni dígito)
- Longitud mínima de 8 caracteres

---

## Implementation plan

1. **Migración: policy de `scores`** — vía MCP `apply_migration` (nombre: `restrict_scores_insert_policy`)
   - `DROP POLICY "public insert scores"` + `CREATE POLICY "authenticated insert own scores"`
     (`FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)`).
   - Verificación: `pg_policies` muestra la nueva policy; `get_advisors(security)` ya no
     reporta `rls_policy_always_true` en `scores`.

2. **Migración: revocar EXECUTE** — vía MCP `apply_migration` (nombre: `revoke_security_definer_execute`)
   - `REVOKE EXECUTE` sobre `handle_new_user()` y `rls_auto_enable()` de `anon, authenticated, public`.
   - Verificación: `get_advisors(security)` ya no reporta los dos
     `*_security_definer_function_executable`.

3. **Verificar que el registro sigue creando el perfil** (tras paso 2)
   - Registrar un usuario de prueba → confirmar que el trigger `on_auth_user_created`
     crea la fila en `profiles` (el revoke no afecta al contexto del trigger).
   - Verificación: nueva fila en `auth.users` + fila correspondiente en `profiles`.

4. **Verificar que guardar score sigue funcionando** (tras paso 1)
   - Con sesión activa, jugar y guardar un score → el INSERT pasa la nueva `WITH CHECK`.
   - Verificación: el score aparece en `scores` con `user_id` correcto y en `/salon`.

5. **`next.config.ts` — headers de seguridad**
   - Añadir `securityHeaders` con los 4 headers y un `headers()` async que los aplique
     a `source: '/(.*)'`. Mantener `allowedDevOrigins` existente sin cambios.

   ```ts
   const securityHeaders = [
     { key: 'X-Content-Type-Options',  value: 'nosniff' },
     { key: 'X-Frame-Options',         value: 'DENY' },
     { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
     { key: 'X-DNS-Prefetch-Control',  value: 'off' },
   ]
   ```

   - Verificación: `curl -I http://localhost:3000` (o DevTools → Network) muestra los
     4 headers en la respuesta.

6. **`app/auth/page.tsx` — validación de contraseña robusta**
   - Definir la constante `PASSWORD_REGEX` al inicio del componente.
   - En el handler de registro, antes de `supabase.auth.signUp`, evaluar
     `PASSWORD_REGEX.test(password)`.
   - Si no pasa: establecer error local y mostrar debajo del campo de contraseña:
     _"La contraseña debe tener mínimo 8 caracteres e incluir mayúsculas, minúsculas,
     números y símbolos."_
   - Si pasa: limpiar el error y continuar con el flujo normal.
   - No llamar a Supabase si la validación falla (evita el round-trip innecesario).
   - Colocar junto a la validación de username existente (antes de la llamada a signUp).
   - Verificación:
     - `"abc"` → muestra error inline, no llama a Supabase.
     - `"password1"` (sin mayúscula ni símbolo) → muestra error inline, no llama a Supabase.
     - `"Abc123!@"` → no muestra error, el flujo continúa normalmente.

7. **Ajustes manuales en Supabase Dashboard** (no código)
   - Authentication → Password: **Minimum password length = 8**.
   - Authentication → Password: **Leaked password protection = ON** (HaveIBeenPwned).
   - Authentication → Rate Limits: limitar **signups por IP** (anti-bot).
   - Verificación: `get_advisors(security)` ya no reporta `auth_leaked_password_protection`.

8. **Verificación final**
   - `get_advisors(security)` devuelve **0** hallazgos de los 6 originales.
   - `npx tsc --noEmit` limpio.
   - Flujos de registro, login y guardado de score siguen funcionando.

---

## Acceptance criteria

- [ ] La policy `public insert scores` (`WITH CHECK true`) ya no existe en `scores`
- [ ] Existe policy de INSERT en `scores` restringida a rol `authenticated` con `WITH CHECK (auth.uid() = user_id)`
- [ ] Un cliente `anon` no puede insertar en `scores` (el INSERT es rechazado por RLS)
- [ ] Un usuario autenticado solo puede insertar scores con su propio `user_id`
- [ ] `get_advisors(security)` no reporta `rls_policy_always_true` en `scores`
- [ ] `EXECUTE` sobre `handle_new_user()` está revocado de `anon`, `authenticated` y `public`
- [ ] `EXECUTE` sobre `rls_auto_enable()` está revocado de `anon`, `authenticated` y `public`
- [ ] `get_advisors(security)` no reporta ningún `anon_security_definer_function_executable` ni `authenticated_security_definer_function_executable`
- [ ] Registrar un usuario nuevo sigue creando su fila en `profiles` vía el trigger (el revoke no rompe el trigger)
- [ ] Guardar un score con sesión activa sigue funcionando y aparece en `/salon`
- [ ] `next.config.ts` emite `X-Content-Type-Options: nosniff` en todas las rutas
- [ ] `next.config.ts` emite `X-Frame-Options: DENY` en todas las rutas
- [ ] `next.config.ts` emite `Referrer-Policy: strict-origin-when-cross-origin` en todas las rutas
- [ ] `next.config.ts` emite `X-DNS-Prefetch-Control: off` en todas las rutas
- [ ] `allowedDevOrigins` existente se conserva en `next.config.ts`
- [ ] El formulario de registro con contraseña `"abc"` muestra error inline y no llama a `supabase.auth.signUp`
- [ ] El formulario de registro con contraseña `"password1"` (sin mayúscula ni símbolo) muestra error inline y no llama a `supabase.auth.signUp`
- [ ] El formulario de registro con contraseña `"Abc123!@"` no muestra error y el flujo continúa normalmente
- [ ] (Dashboard) Minimum password length = 8 activo en Supabase Auth
- [ ] (Dashboard) Leaked password protection activo; `get_advisors(security)` no reporta `auth_leaked_password_protection`
- [ ] (Dashboard) Existe un límite de signups por IP configurado
- [ ] `get_advisors(security)` devuelve 0 de los 6 hallazgos originales
- [ ] `npx tsc --noEmit` pasa sin errores
- [ ] Las demás rutas y flujos de la plataforma no se ven afectados

---

## Decisions

- **Restringir INSERT en `scores` a `auth.uid() = user_id` en lugar de solo `auth.uid() IS NOT NULL`** — además de exigir sesión, impide que un usuario autenticado inserte scores con el `user_id` de otro. Coste cero porque los 4 juegos ya envían `user_id: user.id`.

- **Eliminar el INSERT para invitados (`anon`) en vez de mantener una variante permisiva** — el spec 12 ya decidió que los scores de invitado no se persisten; la policy ahora refleja esa decisión a nivel de base de datos en lugar de confiar solo en el código cliente.

- **`REVOKE EXECUTE` en lugar de cambiar a `SECURITY INVOKER`** — `handle_new_user` necesita `SECURITY DEFINER` para escribir en `profiles` desde el contexto del trigger, y `rls_auto_enable` es un event trigger DDL; cambiarlas a INVOKER rompería su función. Revocar `EXECUTE` elimina la superficie RPC sin afectar su ejecución por trigger.

- **4 headers en lugar de 3** — se agrega `X-DNS-Prefetch-Control: off` al checklist base para evitar que el browser filtre información sobre dominios externos (Supabase, Resend) vía prefetch de DNS. El coste es mínimo y la protección es válida en dark-mode apps con muchos recursos externos.

- **Regex completo de contraseña en cliente, no solo longitud** — el enforcement real lo hace Supabase (dashboard), pero validar complejidad (mayúscula + minúscula + número + símbolo) en el form da feedback inmediato, evita un round-trip y cierra el hueco donde `"password1"` (8 chars, sin complejidad) pasaría la validación de longitud mínima pero sería una contraseña débil. Es defensa en profundidad, no la única barrera.

- **Solo los 4 headers del checklist, sin CSP ni HSTS** — una CSP estricta choca con los inline styles/scripts que Next/Turbopack inyecta; HSTS tiene consecuencias irreversibles en el dominio. Ambos se difieren a un spec propio.

- **Validación de contraseña solo en registro, no en login** — el login delega a Supabase; añadir el regex ahí bloquearía a usuarios que crearon su cuenta antes de este spec o por OAuth.

- **Ajustes de Auth como pasos manuales del dashboard** — min password length, leaked password protection y signup rate no son aplicables por migración ni por el MCP de Supabase; se documentan como pasos manuales verificables vía `get_advisors`.

- **No tocar las policies de SELECT** — la lectura pública de `games`, `scores` y `profiles.username` es intencional (leaderboard y Hall of Fame); restringirla rompería funcionalidad existente.

---

## Risks

| Riesgo | Mitigación |
|---|---|
| La nueva policy de `scores` rechaza inserts si algún juego no envía `user_id` o usa un cliente sin sesión | Verificado: los 4 juegos ya envían `user_id: user.id` con el browser client autenticado. El paso 4 prueba el guardado real antes de cerrar el spec |
| `REVOKE EXECUTE` rompe la creación de perfil al registrarse | El `EXECUTE` del cliente no interviene: el trigger `on_auth_user_created` ejecuta `handle_new_user` en su propio contexto. El paso 3 valida explícitamente que el registro sigue creando la fila en `profiles` |
| Un nuevo `CREATE OR REPLACE` futuro sobre `handle_new_user` o `rls_auto_enable` revierte el revoke | Documentado: si se regeneran esas funciones, re-aplicar el `REVOKE`. `get_advisors` lo detecta de nuevo |
| `X-Frame-Options: DENY` rompe algún embed/iframe legítimo de la app | La app no se embebe en iframes propios; si en el futuro se necesita, cambiar a `SAMEORIGIN` en ese momento |
| Activar leaked password protection bloquea contraseñas de usuarios de prueba existentes al cambiarlas | Solo afecta a nuevas contraseñas/cambios; las sesiones y contraseñas actuales siguen válidas |
| Los pasos de dashboard se olvidan y los advisors siguen abiertos | El paso 8 exige `get_advisors(security)` con 0 hallazgos como criterio de cierre del spec |
| `X-DNS-Prefetch-Control: off` deshabilita optimizaciones de red para recursos externos | Impacto mínimo en performance (prefetch de DNS es una optimización menor); la ganancia de privacidad compensa |
