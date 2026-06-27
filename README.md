# Arcade Vault

Plataforma de juegos arcade online donde los usuarios juegan títulos clásicos y compiten por la mayor puntuación en leaderboards. Cada partida queda asociada a la cuenta del jugador y alimenta los rankings por juego y el salón de la fama.

## Características

- 🎮 **Catálogo de juegos** con buscador y tarjetas con efecto 3D.
- 🏆 **Leaderboards por juego** y un **salón de la fama** global con rankings.
- 🔐 **Autenticación de usuarios** (registro / login / recuperación de contraseña).
- 💾 **Puntuaciones asociadas a cada cuenta**, persistidas en Supabase.
- 🎨 **Skins por juego** (`classic` / `retro` / `neon`).
- 📱 **Diseño responsive** con controles táctiles para móvil.
- ✉️ **Formulario de contacto** vía Resend.

## Juegos incluidos

| Juego | Categoría | Descripción |
|---|---|---|
| Asteroids | SHOOTER | Destruye asteroides y sobrevive el mayor tiempo posible. |
| Snake | ARCADE | Come frutas para crecer y subir de nivel sin chocar. |
| Arkanoid | ARCADE | Rompe todos los bloques de cada nivel sin dejar caer la pelota. |
| Tetris | PUZZLE | Encaja tetrominos y completa líneas antes de que el tablero se llene. |
| Frogger | ARCADE | Guía a tu rana a través de la carretera y el río hasta las cinco bocas. |

## Stack tecnológico

- **[Next.js 16.2.9](https://nextjs.org/)** — App Router, bundler Turbopack por defecto.
- **React 19.2.4** + **TypeScript**.
- **Tailwind CSS v4** (vía `@tailwindcss/postcss`).
- **Supabase** — base de datos y autenticación (`@supabase/supabase-js` + `@supabase/ssr`).
- **Resend** — envío de emails del formulario de contacto.

## Requisitos previos

- **Node.js** 20 o superior.
- Una cuenta y proyecto de **[Supabase](https://supabase.com/)** (base de datos + auth).
- Una cuenta de **[Resend](https://resend.com/)** (opcional, solo para el formulario de contacto).

## Instalación y configuración

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd 05-arcade-vault

# 2. Instalar dependencias
npm install

# 3. Crear el archivo de variables de entorno
cp .env.template .env.local
# Edita .env.local y rellena los valores (ver tabla abajo)

# 4. Aplicar las migraciones de base de datos
#    (desde el dashboard de Supabase o con la Supabase CLI)
#    Los archivos están en supabase/migrations/

# 5. Levantar el servidor de desarrollo
npm run dev
```

La app quedará disponible en [http://localhost:3000](http://localhost:3000).

## Variables de entorno

Definidas en `.env.template`:

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública (publishable) de Supabase. |
| `RESEND_API_KEY` | API key de Resend para el formulario de contacto. |
| `CONTACT_EMAIL` | Correo que recibe los mensajes del formulario. |

## Scripts disponibles

| Script | Acción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo. |
| `npm run build` | Genera el build de producción. |
| `npm run start` | Sirve el build de producción. |
| `npm run lint` | Ejecuta ESLint. |

## Estructura del proyecto

```
app/                 Rutas y páginas (App Router)
  games/             Un juego por carpeta (game.ts, componente, skins.ts)
  _components/       Componentes compartidos (Nav, etc.)
  _context/          Estado de autenticación (AuthContext)
lib/                 Clientes de Supabase y datos compartidos
types/               Tipos auto-generados de Supabase
supabase/migrations/ Migraciones versionadas del esquema
specs/               Especificaciones (spec-driven development)
references/          Documentación interna (juegos, skins, etc.)
```

## Base de datos

El esquema de Supabase usa tres tablas principales:

| Tabla | Descripción |
|---|---|
| `games` | Catálogo de juegos (`name`, `slug`, `description`, `route`, `image_url`). |
| `scores` | Puntuaciones (`score`, `game_slug`, `user_id`, `created_at`). |
| `profiles` | Perfil de usuario; se crea automáticamente al registrarse. |

> ⚠️ **Los cambios de esquema se hacen siempre mediante migraciones versionadas** en `supabase/migrations/`, nunca editando el esquema directamente.

## Desarrollo spec-driven

El proyecto sigue un flujo de **Spec-Driven Development**: cada funcionalidad parte de una especificación en `specs/`, que se mapea a una rama y un PR. Se apoya en las skills de [Klerith/fernando-skills](https://github.com/Klerith/fernando-skills):

```bash
npx skills@latest add Klerith/fernando-skills
```
