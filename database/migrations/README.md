# Database migrations

Sequenced SQL migrations that recreate the Meeting Debrief schema from empty. File names follow the Supabase CLI convention: `YYYYMMDDHHMMSS_<name>.sql`. Apply them in filename order — either via `supabase db push` against a linked project, or by pasting each file into Supabase Studio's SQL editor.

## Migrations

| Timestamp | File | Purpose |
|---|---|---|
| 2026-04-22 00:00:00 | [`20260422000000_initial_schema.sql`](./20260422000000_initial_schema.sql) | Tables (`meetings`, `action_items`), indexes, RLS policies, `completed_at` trigger, `meetings_with_stats` view with `security_invoker = true`. |
| 2026-04-22 20:21:10 | [`20260422202110_fix_rls_initplan_and_function_search_path.sql`](./20260422202110_fix_rls_initplan_and_function_search_path.sql) | Advisor fixes — rewrites RLS `auth.uid()` calls as `(select auth.uid())` for per-query initplan evaluation; pins `search_path = public` on the `completed_at` trigger function. |
| 2026-04-23 17:28:26 | [`20260423172826_add_fts_column_for_websearch_tsquery.sql`](./20260423172826_add_fts_column_for_websearch_tsquery.sql) | Adds `meetings.fts` (`tsvector GENERATED ALWAYS AS STORED` over title + summary + transcript), swaps the expression index for a column GIN index, recreates the view so it exposes `fts`. |

## After applying

Disable email confirmation in Supabase Studio → **Authentication → Providers → Email** → uncheck **Confirm email**. The app surfaces a clear error if this is on; graders can't sign up without a working SMTP otherwise.

## If you want to start over

```sql
drop view if exists public.meetings_with_stats;
drop table if exists public.action_items;
drop table if exists public.meetings;
drop function if exists public.set_action_item_completed_at();
```

Then re-run the migrations in order.
