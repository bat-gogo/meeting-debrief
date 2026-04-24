-- ============================================================================
-- Fix 1 — Optimize RLS policies (per-query auth.uid() eval, not per-row)
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security
--      #call-functions-with-select
--
-- Fix 2 — Pin search_path on trigger function (mutable-search-path hardening)
-- See: https://supabase.com/docs/guides/database/database-linter
--      ?lint=0011_function_search_path_mutable
-- ============================================================================

drop policy "meetings_owner_all" on public.meetings;
drop policy "action_items_owner_all" on public.action_items;

create policy "meetings_owner_all" on public.meetings
  for all to authenticated
  using      ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "action_items_owner_all" on public.action_items
  for all to authenticated
  using      ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter function public.set_action_item_completed_at()
  set search_path = public, pg_temp;
