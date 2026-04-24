-- ============================================================================
-- Meeting Debrief — Initial schema
-- ============================================================================
-- Two tables (meetings, action_items) with:
-- - Row Level Security policies (user_id-scoped, authenticated role only)
-- - A trigger to maintain action_items.completed_at based on is_done flips
-- - A view (meetings_with_stats) exposing open/total action-item counts
--   per meeting, explicitly created with security_invoker = true so it
--   respects the caller's RLS rather than bypassing it
-- - A full-text search GIN index on the meetings base table (expression-based;
--   replaced by a column-based index in a later migration)
-- ============================================================================

-- Tables ---------------------------------------------------------------------

create table public.meetings (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  meeting_date    date not null default current_date,
  participants    text[] not null default '{}',
  raw_transcript  text not null,
  summary         text not null,
  decisions       text[] not null default '{}',
  blockers        text[] not null default '{}',
  followup_email  text not null default '',
  created_at      timestamptz not null default now()
);

create index meetings_user_created_idx
  on public.meetings (user_id, created_at desc);

create index meetings_fts_idx on public.meetings
  using gin (to_tsvector('english',
    coalesce(title,'') || ' ' ||
    coalesce(summary,'') || ' ' ||
    coalesce(raw_transcript,'')));

create table public.action_items (
  id            uuid primary key default gen_random_uuid(),
  meeting_id    uuid not null references public.meetings(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  content       text not null,
  owner         text,
  due_hint      text,
  is_done       boolean not null default false,
  completed_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index action_items_dashboard_idx
  on public.action_items (user_id, is_done, created_at);

create index action_items_meeting_idx
  on public.action_items (meeting_id);

-- Row Level Security ---------------------------------------------------------

alter table public.meetings     enable row level security;
alter table public.action_items enable row level security;

create policy "meetings_owner_all" on public.meetings
  for all to authenticated
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "action_items_owner_all" on public.action_items
  for all to authenticated
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trigger: maintain completed_at based on is_done flips ----------------------

create or replace function public.set_action_item_completed_at()
returns trigger language plpgsql as $$
begin
  if new.is_done and not old.is_done then
    new.completed_at := now();
  elsif not new.is_done and old.is_done then
    new.completed_at := null;
  end if;
  return new;
end $$;

create trigger action_items_completed_at
  before update on public.action_items
  for each row execute function public.set_action_item_completed_at();

-- View for the list page: meeting rows + open/total action-item counts ------
-- security_invoker = true is CRITICAL — otherwise the view bypasses RLS
-- and would leak other users' meetings to any authenticated caller.

create view public.meetings_with_stats
  with (security_invoker = true) as
select
  m.*,
  coalesce(count(ai.id) filter (where ai.is_done = false), 0)::int as open_count,
  coalesce(count(ai.id), 0)::int                                   as total_count
from public.meetings m
left join public.action_items ai on ai.meeting_id = m.id
group by m.id;
