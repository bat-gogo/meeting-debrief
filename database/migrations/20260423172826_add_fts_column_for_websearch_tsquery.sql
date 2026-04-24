-- ============================================================================
-- Add a GENERATED (stored) tsvector column so Supabase JS .textSearch()
-- can target a real column (PostgREST requires a column reference, not an
-- expression index, for .textSearch calls). The expression is identical to
-- the original index, so search semantics don't change — we're just giving
-- the tsvector a name the client can reference.
-- ============================================================================

alter table public.meetings
  add column fts tsvector generated always as (
    to_tsvector('english',
      coalesce(title, '')     || ' ' ||
      coalesce(summary, '')   || ' ' ||
      coalesce(raw_transcript, ''))
  ) stored;

-- Replace the old expression-index with a column-index. Postgres will
-- automatically repopulate fts for existing rows during ALTER TABLE, so
-- the index has data to use immediately.

drop index if exists public.meetings_fts_idx;
create index meetings_fts_idx on public.meetings using gin (fts);

-- The meetings_with_stats view selects m.*, which was resolved when the
-- view was created (before the fts column existed). Drop + recreate so
-- the view picks up the new column.

drop view if exists public.meetings_with_stats;

create view public.meetings_with_stats
  with (security_invoker = true) as
select
  m.*,
  coalesce(count(ai.id) filter (where ai.is_done = false), 0)::int as open_count,
  coalesce(count(ai.id), 0)::int                                   as total_count
from public.meetings m
left join public.action_items ai on ai.meeting_id = m.id
group by m.id;
