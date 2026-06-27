# SPEC 12 — Autenticación completa (email/password + OAuth)

> **Status:** Implementado · **Depends on:** 04-supabase-integracion-base · **Date:** 2026-06-25
> **Objective:** Reemplazar el sistema de auth mock (localStorage) por Supabase Auth real con
> email/password, Google y GitHub; añadir perfil de usuario con username; asociar scores a
> cuentas reales; mantener el modo invitado (sin guardar scores).

---

## Scope

**In:**

- `app/auth/page.tsx` — conectar formulario login/registro a Supabase Auth real
- `app/auth/reset/page.tsx` — nueva ruta para solicitar y confirmar reset de contraseña
- `app/_context/AuthContext.tsx` — reemplazar mock localStorage por sesión Supabase (`onAuthStateChange`)
- `app/_components/Nav.tsx` — mostrar username del perfil y botón "Cerrar sesión" cuando hay sesión activa
- `lib/supabase/client.ts` — ya existe; se usa para operaciones auth en cliente
- `lib/supabase/server.ts` — ya existe; se usa para leer sesión en Server Components
- Tabla `profiles` nueva — `id` (FK → `auth.users`), `username` (único, max 10 chars); creada por trigger en Supabase al registrarse
- Tabla `scores` — añadir columna `user_id` nullable (FK → `auth.users`)
- Flujo registro: email + username + password → cuenta inmediata sin verificación de email
- Flujo login: email + password
- Flujo OAuth: Google y GitHub (proveedores configurados en Supabase dashboard en el paso 1 del plan)
- Flujo reset: formulario "¿olvidaste tu contraseña?" → email de Supabase → ruta `/auth/reset` confirma nueva contraseña detectando el evento `PASSWORD_RECOVERY` de `onAuthStateChange`
- Score saving: si hay sesión activa, guardar con `user_id` + `player_name = profile.username`; si es invitado, no ejecutar el INSERT
- En pantalla de juego: si hay sesión, omitir el campo "ingresa tu nombre" — usar directamente el username del perfil
- Botón "JUGAR COMO INVITADO" — **eliminado completamente** de ambos tabs de `/auth`; la app ya es accesible sin login de forma natural, el botón era un artefacto del mock

**Out of scope:**

- Verificación de email al registrarse — alta inmediata
- Rutas protegidas — toda la app sigue siendo accesible sin sesión
- Edición de perfil (cambio de username, avatar) — spec posterior
- Invitados con scores temporales o persistidos localmente
- Magic link / SMS auth
- Página `/player/[id]` (perfil público del jugador) — no cambia en este spec
- Cambios al leaderboard o a `/salon` — solo se benefician automáticamente del `user_id` cuando los scores lleguen

---

## Data model

### Nueva tabla `profiles`

```sql
CREATE TABLE profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   text NOT NULL UNIQUE CHECK (char_length(username) <= 10),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger: crea el perfil automáticamente al registrarse
-- Para usuarios OAuth sin username en metadata, usa la parte local del email (truncada a 10 chars)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      left(split_part(NEW.email, '@', 1), 10)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

RLS en `profiles`: SELECT público (para mostrar username en leaderboard), UPDATE solo
`auth.uid() = id` (el usuario solo edita su propio perfil).

### Migración tabla `scores`

```sql
ALTER TABLE scores
  ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
```

`user_id` es nullable — scores anteriores y de invitados futuros quedan con `NULL`
sin necesidad de migración de datos.

### Tipos actualizados (`types/database.ts`)

Regenerar con `supabase gen types typescript` tras aplicar las migraciones.

### AuthContext

```ts
interface AuthContextValue {
  user: import('@supabase/supabase-js').User | null
  profile: { username: string } | null   // de tabla profiles
  signOut: () => Promise<void>
}
```

`login()` desaparece — el login lo maneja Supabase directamente desde `app/auth/page.tsx`.
`AuthProvider` suscribe a `onAuthStateChange` y carga el perfil desde `profiles` cuando
hay sesión.

---

## Implementation plan

1. **Configurar proveedores en Supabase Dashboard**
   - Authentication → Providers → Email: activado, "Confirm email" OFF (alta inmediata).
   - Authentication → Providers → Google: activar, pegar Client ID y Secret.
   - Authentication → Providers → GitHub: activar, pegar Client ID y Secret.
   - Authentication → URL Configuration → Site URL: `http://localhost:3000`.
   - Añadir a Redirect URLs: `http://localhost:3000/auth/callback` y el dominio de
     producción cuando corresponda. **Sin esto, el flujo OAuth falla con
     `redirect_uri_mismatch`** — debe completarse antes de probar Google o GitHub.
   - Verificación: los tres proveedores aparecen como "Enabled" en el dashboard.

2. **Migraciones Supabase** — vía MCP (`apply_migration`)
   - Crear tabla `profiles` + función `handle_new_user` + trigger `on_auth_user_created`
   - `ALTER TABLE scores ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL`
   - Configurar RLS en `profiles`: SELECT público, UPDATE solo `auth.uid() = id`
   - Regenerar `types/database.ts` con `generate_typescript_types`

3. **`app/_context/AuthContext.tsx`**
   - Reemplazar mock por `createBrowserClient` de `@supabase/ssr`
   - `useEffect` suscribe a `supabase.auth.onAuthStateChange`; al detectar sesión activa,
     query a `profiles` para obtener `{ username }`
   - Eliminar `login()` y la dependencia de `lib/data.ts` → tipo `User` mock
   - Exponer `{ user, profile, signOut }`
   - Verificación: `useUser().profile.username` devuelve el username tras login; `null`
     tras logout.

4. **`app/auth/page.tsx`**
   - Tab **INICIAR SESIÓN**:
     - Campos email + password → `supabase.auth.signInWithPassword()`
     - Mostrar errores inline (credenciales incorrectas, email no confirmado, etc.)
     - Enlace "¿Olvidaste tu contraseña?" que navega a `/auth/reset`
     - Tras login exitoso: `router.push('/biblioteca')`
   - Tab **CREAR CUENTA**:
     - Campos username + email + password → `supabase.auth.signUp({ email, password, options: { data: { username } } })`
     - `username` se pasa en `user_metadata` para que el trigger lo use al crear el perfil
     - Mostrar errores inline (email ya registrado, username inválido, etc.)
     - Tras registro exitoso: `router.push('/biblioteca')` (alta inmediata, sin verificación)
   - Botones OAuth Google y GitHub:
     `supabase.auth.signInWithOAuth({ provider: 'google' | 'github', options: { redirectTo: 'http://localhost:3000/auth/callback' } })`
   - **Eliminar el botón "JUGAR COMO INVITADO" de ambos tabs** — la app es accesible
     sin login de forma natural; el botón era un artefacto del mock.

5. **`app/auth/reset/page.tsx`** — nueva ruta, dos pasos en la misma página

   **Paso 1 — Solicitar reset** (URL sin token: `/auth/reset`):
   - Formulario con campo email → `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'http://localhost:3000/auth/reset' })`
   - Tras envío exitoso: mostrar mensaje "Revisa tu correo — te hemos enviado un enlace"

   **Paso 2 — Confirmar nueva contraseña** (usuario llega desde el link del email):
   - Supabase emite el evento `PASSWORD_RECOVERY` vía `onAuthStateChange` cuando el
     usuario abre la URL con el token. El componente debe suscribirse a ese evento
     (no leer la URL manualmente) para detectar cuándo mostrar el formulario de nueva
     contraseña en lugar del formulario de solicitud.
   - Formulario "Nueva contraseña" + "Confirmar contraseña" → `supabase.auth.updateUser({ password })`
   - Tras éxito: `router.push('/biblioteca')`

6. **`app/_components/Nav.tsx`**
   - Consumir `useUser()` para leer `user` y `profile`
   - Si `profile` existe: mostrar `profile.username` + botón "SALIR" → `signOut()`
   - Si no hay sesión: mostrar botón "ENTRAR" → `/auth`
   - Reemplazar cualquier referencia al `user.name` del mock por `profile.username`

7. **Score saving en los 4 juegos**
   En cada `<Name>Game.tsx` (Asteroids, Tetris, Arkanoid, Snake), modificar la función
   `saveScore()` existente:
   - Si `user` de AuthContext existe: incluir `user_id: user.id` y
     `player_name: profile.username` en el INSERT a `scores`; no mostrar el modal de
     "ingresa tu nombre" (el username ya está disponible)
   - Si `user` es null (invitado): saltarse el INSERT completo (score no se persiste)
   - El ref `scoreSaved` existente en cada componente sigue evitando doble inserción

8. **Verificación**
   - `npx tsc --noEmit` limpio
   - Registro crea fila en `auth.users` y en `profiles` vía trigger
   - Login con email/password establece sesión; `profile.username` aparece en Nav
   - OAuth Google y GitHub completan el flujo y regresan a `/biblioteca`
   - `/auth/reset` Paso 1: el email de reset llega; el link abre `/auth/reset`
   - `/auth/reset` Paso 2: el componente detecta `PASSWORD_RECOVERY`, muestra el
     formulario de nueva contraseña, y la nueva contraseña funciona al iniciar sesión
   - Invitado puede jugar; su score no se inserta en `scores`
   - Jugador autenticado juega; score aparece en `/salon` con su username
   - `signOut()` limpia la sesión; Nav vuelve a mostrar "ENTRAR"

---

## Acceptance criteria

- [ ] Registro con email/password crea fila en `auth.users` y en `profiles` (trigger funciona)
- [ ] `profiles.username` respeta el CHECK: máximo 10 caracteres, único
- [ ] OAuth users sin username en metadata obtienen username desde la parte local del email (truncado a 10 chars) vía el `COALESCE` del trigger
- [ ] Login con email/password establece sesión; Nav muestra `profile.username` y botón "SALIR"
- [ ] OAuth Google completa el flujo y redirige a `/biblioteca` con sesión activa
- [ ] OAuth GitHub completa el flujo y redirige a `/biblioteca` con sesión activa
- [ ] "¿Olvidaste tu contraseña?" en `/auth` navega a `/auth/reset`
- [ ] `/auth/reset` sin token muestra formulario de solicitud de reset y envía el email
- [ ] Al abrir `/auth/reset` desde el link del email, el componente detecta el evento `PASSWORD_RECOVERY` de `onAuthStateChange` y muestra el formulario de nueva contraseña (no el formulario de solicitud)
- [ ] `/auth/reset` con token válido permite definir nueva contraseña; la nueva contraseña funciona al iniciar sesión
- [ ] `signOut()` destruye la sesión; Nav vuelve a mostrar botón "ENTRAR"
- [ ] El botón "JUGAR COMO INVITADO" no aparece en ningún tab de `/auth`
- [ ] Invitado (sin sesión) puede jugar todos los juegos sin restricción
- [ ] Score de invitado NO se inserta en `scores`
- [ ] Score de jugador autenticado se inserta con `user_id` y `player_name = profile.username`
- [ ] Score de jugador autenticado aparece en `/salon` con el username correcto
- [ ] Pantalla de juego no muestra el modal de "ingresa tu nombre" cuando hay sesión activa
- [ ] Errores de Supabase se muestran inline en el formulario (email duplicado, contraseña incorrecta)
- [ ] `scores` existentes con `user_id = NULL` no se ven afectados
- [ ] `npx tsc --noEmit` pasa sin errores
- [ ] Las demás rutas de la plataforma no se ven afectadas

---

## Decisions

- **`profiles` tabla separada en lugar de solo `user_metadata`** — `user_metadata` no es
  consultable vía SQL desde Server Components ni joinable en el leaderboard; una tabla
  `profiles` es indexable, protegible con RLS y evita exponer datos internos de `auth.users`.

- **Trigger `on_auth_user_created` para crear el perfil** — garantiza que todo usuario
  (incluidos los de OAuth) tenga siempre una fila en `profiles`; hacerlo en el trigger
  evita la condición de carrera donde el INSERT del perfil falla pero el usuario ya existe
  en `auth.users`.

- **Username pasado en `user_metadata` al hacer `signUp`** — mecanismo oficial de Supabase
  para pasar datos extras al trigger sin una segunda llamada desde el cliente.

- **`COALESCE` en el trigger para OAuth users** — usuarios de Google o GitHub no pasan
  username; el fallback `left(split_part(email, '@', 1), 10)` garantiza que la constraint
  `NOT NULL` de `profiles.username` nunca falle.

- **`user_id` nullable en `scores`, no NOT NULL** — scores anteriores y de invitados
  futuros coexisten sin migración de datos; la nullable permite ambos casos sin romper nada.

- **Score de invitado no se persiste** — simplifica `saveScore()` (un solo condicional);
  evita llenar `scores` con filas anónimas no reclamables.

- **Sin verificación de email al registrarse** — la app está en desarrollo activo; alta
  inmediata agiliza las pruebas. Se puede activar en Supabase dashboard sin cambios de
  código cuando sea necesario.

- **`PASSWORD_RECOVERY` vía `onAuthStateChange`, no lectura manual de la URL** — Supabase
  emite este evento automáticamente cuando el usuario abre el link de reset; leer el token
  del hash manualmente es frágil (algunos proxies eliminan el fragmento `#`).

- **Botón "JUGAR COMO INVITADO" eliminado** — con Supabase Auth real la app ya es
  accesible sin login de forma natural; el botón era un artefacto del mock que ya no
  aporta valor.

- **`login()` eliminado de AuthContext** — ya no tiene sentido con Supabase manejando
  la sesión; cualquier componente que lo llamara debe migrar a los métodos de `supabase.auth`.

---

## Risks

| Riesgo | Mitigación |
|---|---|
| Trigger falla para OAuth si el email está vacío | `COALESCE` en el trigger usa `split_part(email, '@', 1)` como fallback; la constraint `NOT NULL` en `profiles.username` hará fallar el registro antes que dejar un perfil roto |
| Callback URL de OAuth no configurada en Supabase dashboard | Documentado en el paso 1: añadir `http://localhost:3000/auth/callback` a Redirect URLs antes de probar OAuth; sin esto el flujo falla con `redirect_uri_mismatch` |
| Componentes que aún usen `user.name` del mock rompan tras reemplazar AuthContext | `npx tsc --noEmit` detecta cualquier referencia restante al tipo `User` viejo; el paso 6 cubre Nav explícitamente |
| Score saving en algún juego no usa la función `saveScore()` centralizada | El paso 7 enumera los 4 juegos explícitamente; si alguno tiene un patrón distinto, centralizar en un helper `saveScore(score, gameSlug)` antes de modificar |
| `/auth/reset` recibe el token como hash fragment y algún proxy lo elimina | Usar `onAuthStateChange` con evento `PASSWORD_RECOVERY` en lugar de leer la URL manualmente; Supabase lo emite independientemente de cómo llegue el token |
| Dominio de producción no añadido a Redirect URLs antes de desplegar | Añadir el dominio real al dashboard de Supabase antes de activar OAuth en producción |
