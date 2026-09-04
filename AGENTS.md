# Agent instructions

These notes apply to every coding agent working in this repository (Cursor Cloud, local Cursor, and similar). Keep them current when the workflow changes.

## Project-wide conventions

- Conventional commits (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`).
- English and German UI strings together in `src/lib/i18n/messages.ts`. The `de` object must match `en` exactly.
- Offline-first: household data lives in the IndexedDB snapshot and outbox in `src/lib/offline/sync.ts`. New tables need types, pull, persist, outbox, and hydrate defaults so older snapshots still load.
- Chores (`src/lib/chores.ts`) use frequency (every N weeks/months) and three intensities (light 5 / medium 10 / heavy 20). Completions award points and feed the household scoreboard.
- Svelte 5 runes (`$state`, `$derived`, `$props`, `$bindable`). Do not use Svelte 4 `export let` or `on:click`.
- Do not commit secrets. Environment values come from Cloud Agent secrets / `.env` (`PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_SECRET_KEY`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`).

## Supabase schema changes

Apply schema changes **directly** with the Supabase Management API and the `SUPABASE_ACCESS_TOKEN` secret. Do not ask someone to paste SQL in the dashboard.

- Endpoint: `POST https://api.supabase.com/v1/projects/{SUPABASE_PROJECT_ID}/database/query`
- Header: `Authorization: Bearer $SUPABASE_ACCESS_TOKEN`
- Send a browser-like `User-Agent`. Requests without one are blocked (Cloudflare 403 / 1010).
- Always keep a matching file under `supabase/migrations/` (`005_…sql`, then `006_…`, …) and append that filename in `src/routes/+page.server.ts`.
- Enable RLS on every new `public` table. Follow existing `private.is_household_member(household_id)` patterns. `UPDATE` policies need a matching `SELECT` policy.
- After applying SQL, verify with a follow-up query (table list, `\d`-style `information_schema` check, or a smoke `select`).

Example:

```sh
curl -sS -A 'Mozilla/5.0' \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  --data-binary @"supabase/migrations/005_cookbooks_social.sql.json" \
  "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_ID/database/query"
```

Prefer posting JSON `{"query": "<sql>"}` from a short script so the migration file itself stays plain SQL.

## Mealie imports

Basement accepts Mealie recipe zip/JSON exports (single recipe zip, bulk zip of many JSON files, or a live Mealie API token). Parser: `src/lib/mealie.ts`.
