# Basement

Household shopping lists that leave the house. Write them downstairs, check them off in the aisle — even when the signal does not.

Basement is an installable PWA: dark, shared with the household, and built to keep working offline.

## What it does

- **Multiple lists** per household — groceries, hardware, whatever you dump on the way out
- **Recipes** with ingredients, steps, a photo, and nutrition (calories, fat, protein, fiber)
- **Scale a recipe** by servings, then push the scaled ingredients onto a shopping list (merging amounts when the item is already there)
- **Check-off that lands for everyone** via Supabase Realtime, so nobody buys a second bottle of oat milk
- **Quantity and a note** on each item
- **Suggestions** from what the house has bought before
- **Invites** so a partner or family member joins the same lists
- **Offline first** — IndexedDB snapshot + outbox, service worker, home-screen install
- **English and German**, switchable in Settings

## Stack

[SvelteKit](https://svelte.dev/docs/kit) 2 / Svelte 5, [Supabase](https://supabase.com) (Auth, Postgres, RLS, Realtime), [Tailwind CSS](https://tailwindcss.com) 4, Node 22.

## Setup

```sh
npm install
cp .env.example .env
```

Fill `.env`:

| Variable                          | Purpose                                                |
| --------------------------------- | ------------------------------------------------------ |
| `PUBLIC_BASE_URL`                 | Site origin, e.g. `http://localhost:5173`              |
| `PUBLIC_SUPABASE_URL`             | Project URL                                            |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Anon / publishable key                                 |
| `SUPABASE_SERVICE_SECRET_KEY`     | Service role (server-only; not required to run the UI) |
| `SUPABASE_PROJECT_ID`             | Used by `npm run gen-types`                            |

In the [Supabase dashboard](https://supabase.com/dashboard):

1. Authentication → URL configuration
   - Site URL = `PUBLIC_BASE_URL`
   - Redirect URLs include `{PUBLIC_BASE_URL}/auth/callback`
2. Run the SQL in `supabase/migrations/` in order (`001_init.sql`, then `002_locale.sql`, `003_shopping_features.sql`, `004_recipes.sql` if you already applied older files). The landing page also copies this SQL when keys are missing.
3. Enable Realtime for `public.list_items` and `public.lists` if the publication statements were skipped.

Then:

```sh
npm run dev
```

Sign up, create a list, install it on your phone, and take it into a dead zone.

## Scripts

| Command                           |                                                                 |
| --------------------------------- | --------------------------------------------------------------- |
| `npm run dev`                     | Vite dev server                                                 |
| `npm run build`                   | Production build (`adapter-node`)                               |
| `npm run preview`                 | Serve the build locally                                         |
| `npm start`                       | `node build/index.js`                                           |
| `npm run check`                   | `svelte-check`                                                  |
| `npm run lint` / `npm run format` | Prettier + ESLint                                               |
| `npm run gen-types`               | Refresh `src/lib/types/database.types.ts` from the live project |

## Layout

- `src/routes/app` — lists, recipes, household, settings (auth required)
- `src/lib/offline` — IndexedDB, snapshot, outbox, sync
- `src/lib/i18n` — locale cookie, messages, switcher
- `src/service-worker.ts` — asset + visited-page cache
- `supabase/migrations` — schema, RLS, household bootstrap
