# 03 — About Page + Contact Form con Resend

> **Status:** Aprobado · **Depends on:** 01-mvp-visual-ui, 02-home-page · **Date:** 2026-06-14
> **Objective:** Implementar la página `/about` con la sección "Acerca de" y un
> formulario de contacto que envía correos reales usando Resend, fiel al diseño
> de `references/templates/home-about/about.jsx`. El destinatario del correo
> se configura vía variable de entorno (ver Decisions).

---

## Scope

**In:**

- `app/about/page.tsx` — página `/about` (Client Component, contiene todo el About)
- Sección "Acerca de": kicker, título, misión, 3 highlight cards con íconos pixel SVG
  (`HighlightIcon`: HEART, BROWSER, PLANT)
- Divider animado con pixel-spans
- Sección "Contacto": grid intro + formulario con campos nombre, email, mensaje
- Estado de éxito: terminal mock (VAULT-OS) idéntico al template
- Estado de error (envío fallido): mensaje inline en el form, botón de reintento
- Validación cliente: shake animation si algún campo está vacío
- `app/about/actions.ts` — Server Action que llama a Resend API
- Variables de entorno `RESEND_API_KEY` y `CONTACT_EMAIL`, documentadas en
  `.env.template` (ya existente en el proyecto) y añadidas a `.env.local`
- Link "ACERCA DE" añadido al Nav existente (`app/_components/Nav.tsx`)
- Animaciones reveal via `IntersectionObserver` (mismo patrón que `useReveal` en Home)

**Out of scope:**

- Dominio verificado en Resend (el usuario lo configura cuando esté listo)
- Email de confirmación al remitente
- Rate limiting o protección anti-spam en el endpoint
- Otras modificaciones al Nav más allá del link nuevo
- Cualquier otra ruta existente

---

## Data model

Este spec no introduce estructuras de datos persistentes. El formulario vive
en estado local del componente. La Server Action no persiste nada — solo
transmite a Resend y devuelve un resultado.

### Tipos locales en `app/about/page.tsx`

```ts
interface ContactForm {
  name: string
  email: string
  msg: string
}

type SendResult =
  | { ok: true;  name: string }
  | { ok: false; error: string }
```

### Server Action en `app/about/actions.ts`

```ts
'use server'
export async function sendContact(
  form: ContactForm
): Promise<SendResult>
```

Llama a `resend.emails.send()` con:
- `from`: `'Arcade Vault <onboarding@resend.dev>'`
- `to`: `[process.env.CONTACT_EMAIL!]`
- `subject`: `'[Arcade Vault] Nuevo mensaje de contacto'`
- `text`: cuerpo plano con nombre, email y mensaje del usuario

> **Nota (modo sandbox):** mientras no haya un dominio verificado en Resend,
> `onboarding@resend.dev` solo puede enviar correos a la dirección con la que
> se registró la cuenta de Resend. Por eso `CONTACT_EMAIL` debe valer
> `bucaramanga246@gmail.com` por ahora. Cualquier otro valor hará que Resend
> rechace el envío aunque la API key sea válida.

---

## Implementation plan

1. **Variables de entorno**
   - En `.env.template` (ya existente): documentar `RESEND_API_KEY=` y
     `CONTACT_EMAIL=`, con un comentario indicando que en modo sandbox
     `CONTACT_EMAIL` debe ser el correo registrado en Resend
     (`bucaramanga246@gmail.com`)
   - En `.env.local`: añadir
     - `RESEND_API_KEY=` (vacío — el usuario coloca su clave real manualmente)
     - `CONTACT_EMAIL=bucaramanga246@gmail.com`
   - Confirmar que `.env.local` está en `.gitignore`

2. **Server Action** (`app/about/actions.ts`)
   - Instalar `resend` con `npm install resend`
   - Crear la Server Action `sendContact(form)` que:
     - Valida que `process.env.RESEND_API_KEY` y `process.env.CONTACT_EMAIL`
       existan; si falta alguna, retorna `{ ok: false, error: '...' }` sin
       llamar a Resend
     - Instancia `new Resend(process.env.RESEND_API_KEY)`
     - Llama `resend.emails.send()` con los campos definidos en el data model,
       usando `to: [process.env.CONTACT_EMAIL]`
     - Retorna `{ ok: true, name }` si tiene éxito
     - Captura el error de Resend y retorna `{ ok: false, error: string }` si falla

3. **Página `/about`** (`app/about/page.tsx`)
   - Crear como Client Component (`'use client'`)
   - Hook `useReveal` (mismo patrón que en `app/page.tsx`, declarado localmente)
   - Componente `HighlightIcon` (HEART, BROWSER, PLANT) — SVGs pixel del template
   - Estado del form: `ContactForm` con campos `name`, `email`, `msg`
   - Estado UI: `result: SendResult | null`, `sending: boolean`, `shake: boolean`
   - `onSubmit`:
     1. Valida campos vacíos → shake y return
     2. Activa `sending = true`
     3. Llama `await sendContact(form)`
     4. Si `ok: true` → muestra terminal de éxito con el nombre
     5. Si `ok: false` → muestra mensaje de error inline con botón reintento
     6. `sending = false`
   - Botón de envío deshabilitado mientras `sending === true`
   - Sección "Acerca de": kicker, título, misión, 3 highlight cards con reveal
   - Divider animado
   - Sección "Contacto": intro + form / terminal éxito / error inline

4. **Nav** (`app/_components/Nav.tsx`)
   - Añadir link `<Link href="/about">ACERCA DE</Link>` junto a los existentes
   - Aplicar la misma clase CSS que usan los otros links del Nav

---

## Acceptance criteria

- [ ] `/about` renderiza la sección "Acerca de" con kicker, título, misión y
      las 3 highlight cards (HEART, BROWSER, PLANT) con sus íconos pixel SVG
- [ ] El divider animado aparece entre las dos secciones
- [ ] La sección "Contacto" muestra el grid intro + formulario
- [ ] Si algún campo está vacío al enviar, el form aplica shake y no llama la API
- [ ] Con campos válidos, el botón queda deshabilitado mientras se envía
- [ ] Envío exitoso → se reemplaza el form por el terminal VAULT-OS con el nombre
      del usuario en mayúsculas
- [ ] "ENVIAR OTRO MENSAJE" en el terminal limpia el estado y vuelve al form
- [ ] Envío fallido → mensaje de error inline visible en el form con botón reintento
- [ ] Si `RESEND_API_KEY` o `CONTACT_EMAIL` no están definidas, la Server Action
      retorna `{ ok: false, error }` sin lanzar excepción
- [ ] El correo llega a la dirección configurada en `CONTACT_EMAIL`
      (`bucaramanga246@gmail.com` en modo sandbox), verificable una vez que
      `RESEND_API_KEY` esté configurada
- [ ] Las animaciones reveal se activan al hacer scroll
- [ ] El Nav muestra el link "ACERCA DE" que navega a `/about`
- [ ] Todas las rutas existentes (`/biblioteca`, `/detalle`, `/player`,
      `/auth`, `/salon`, `/`) siguen funcionando sin cambios
- [ ] `tsc --noEmit` pasa sin errores

---

## Decisions

- **Server Action en lugar de Route Handler** — `app/about/actions.ts` con
  `'use server'` es más simple que un `POST /api/contact`: no requiere fetch
  manual, el tipado es end-to-end, y encaja con App Router. Descartado: Route
  Handler (`app/api/contact/route.ts`).

- **Sandbox de Resend (`onboarding@resend.dev`)** — sin dominio verificado,
  Resend solo permite enviar desde este remitente y solo al email registrado
  en la cuenta. Se usa temporalmente; cuando el usuario verifique un dominio,
  el `from` cambia a una dirección propia.

- **`to` vía variable de entorno `CONTACT_EMAIL`, sin hardcodear** — en modo
  sandbox, `onboarding@resend.dev` solo puede enviar al correo con el que se
  registró la cuenta de Resend (`bucaramanga246@gmail.com`). En lugar de fijar
  ese valor en el código, se lee de `CONTACT_EMAIL`. Cuando se verifique un
  dominio, basta cambiar esa variable (y el `from`) sin modificar la Server
  Action. La variable solo se lee en el servidor, no se expone al cliente.
  Descartado: hardcodear el destinatario (abre vector de spam y obliga a
  tocar código al migrar fuera de sandbox).

- **Se reutiliza `.env.template` existente** — el proyecto ya mantiene
  `.env.template` como plantilla documentada de variables de entorno; el spec
  documenta `RESEND_API_KEY` y `CONTACT_EMAIL` ahí en lugar de crear un nuevo
  `.env.example`.

- **`useReveal` local en `app/about/page.tsx`** — el hook no se extrae a un
  archivo compartido porque ya existe una copia en `app/page.tsx` y no hay
  otros consumidores. Si en el futuro se usa en más páginas, se mueve a
  `app/_hooks/useReveal.ts`.

- **`HighlightIcon` como componente privado** — los SVGs pixel solo se usan
  en esta página; no se extraen a `_components/`.

- **Error inline en lugar de página de error** — permite al usuario corregir
  y reintentar sin perder el contenido del form.

- **API key y email destino solo como placeholders en el spec** — el usuario
  los configura manualmente en `.env.local` antes de implementar; nunca se
  escriben en el spec ni en el código.

---

## Risks

| Risk | Mitigation |
| ---- | ---------- |
| `CONTACT_EMAIL` se configura con un valor distinto al de la cuenta Resend mientras se está en sandbox → los correos no llegan | `.env.template` documenta explícitamente que en sandbox `CONTACT_EMAIL` debe ser `bucaramanga246@gmail.com`; la Server Action no valida esto en runtime (Resend devolverá el error) |
| `RESEND_API_KEY` o `CONTACT_EMAIL` no configuradas en `.env.local` → la Server Action lanza un error en runtime | La Server Action valida ambas variables al inicio; si falta alguna retorna `{ ok: false, error: '...' }` en lugar de explotar |
| Clases CSS de `about.jsx` no presentes en `styles.css` (`about-hero`, `contact-grid`, `terminal-success`, `shake`, etc.) | Revisar `styles.css` antes de implementar; añadir los bloques faltantes a `globals.css` |
| `useReveal` con StrictMode monta el efecto dos veces | Cleanup `io.disconnect()` ya presente en el template; verificar que se aplica correctamente |
| Al verificar un dominio en Resend, se actualiza `CONTACT_EMAIL` pero no el `from` (o viceversa) | Documentar en `.env.template` que ambos valores deben actualizarse juntos al migrar de sandbox a dominio verificado |