create table if not exists public.grammar_topics (
  id uuid primary key default gen_random_uuid(),
  topic_key text not null unique,
  title_zh text not null,
  title_en text not null default '',
  module_key text not null,
  parent_topic_key text,
  sequence_order integer not null unique,
  category text not null check (category in ('syntax', 'morphology', 'tense', 'verb', 'reference')),
  level text not null check (level in ('core', 'extension', 'advanced', 'reference')),
  is_assessable_now boolean not null default false,
  tags jsonb not null default '[]'::jsonb,
  content jsonb not null default '{}'::jsonb,
  source_refs jsonb not null default '[]'::jsonb,
  content_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.grammar_topic_sources (
  id bigint generated always as identity primary key,
  topic_id uuid not null references public.grammar_topics(id) on delete cascade,
  source_catalog text not null check (source_catalog in ('D1', 'D2', 'D3')),
  source_item_key text not null unique,
  source_title text not null,
  coverage_mode text not null check (coverage_mode in ('direct', 'merged', 'advanced', 'reference', 'excluded_with_reason')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.grammar_teaching_progress (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.grammar_topics(id) on delete cascade,
  scope_key text not null default 'shared',
  status text not null default 'not_started' check (status in ('not_started', 'to_teach', 'needs_review', 'confirmed_complete')),
  first_taught_at timestamptz,
  confirmed_at timestamptz,
  last_lesson_date date,
  note text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (topic_id, scope_key)
);

create table if not exists public.grammar_progress_events (
  id bigint generated always as identity primary key,
  topic_id uuid not null references public.grammar_topics(id) on delete cascade,
  scope_key text not null default 'shared',
  old_status text check (old_status is null or old_status in ('not_started', 'to_teach', 'needs_review', 'confirmed_complete')),
  new_status text not null check (new_status in ('not_started', 'to_teach', 'needs_review', 'confirmed_complete')),
  lesson_date date,
  note text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists grammar_topics_module_sequence_idx on public.grammar_topics(module_key, sequence_order);
create index if not exists grammar_topic_sources_topic_idx on public.grammar_topic_sources(topic_id);
create index if not exists grammar_teaching_progress_scope_status_idx on public.grammar_teaching_progress(scope_key, status);
create index if not exists grammar_progress_events_topic_scope_idx on public.grammar_progress_events(topic_id, scope_key, created_at desc);

create or replace function public.touch_grammar_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger grammar_topics_touch_updated_at before update on public.grammar_topics
for each row execute function public.touch_grammar_updated_at();
create trigger grammar_topic_sources_touch_updated_at before update on public.grammar_topic_sources
for each row execute function public.touch_grammar_updated_at();

create or replace function public.is_grammar_teacher()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') in ('teacher', 'admin');
$$;

create or replace function public.set_grammar_progress(
  p_topic_key text,
  p_status text,
  p_scope_key text default 'shared',
  p_lesson_date date default null,
  p_note text default '',
  p_only_if_missing boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_topic_id uuid;
  v_old_status text;
  v_now timestamptz := now();
begin
  if not public.is_grammar_teacher() then
    raise exception using errcode = '42501', message = 'teacher authorization required';
  end if;
  if p_status not in ('not_started', 'to_teach', 'needs_review', 'confirmed_complete') then
    raise exception using errcode = '22023', message = 'invalid grammar progress status';
  end if;
  if p_scope_key <> 'shared' then
    raise exception using errcode = '22023', message = 'only shared scope is enabled';
  end if;

  select id into v_topic_id from public.grammar_topics where topic_key = p_topic_key;
  if v_topic_id is null then
    raise exception using errcode = 'P0002', message = 'grammar topic not found';
  end if;

  select status into v_old_status
  from public.grammar_teaching_progress
  where topic_id = v_topic_id and scope_key = p_scope_key
  for update;

  if p_only_if_missing and found then
    return jsonb_build_object('status', 'skipped_existing', 'topicKey', p_topic_key, 'currentStatus', v_old_status);
  end if;

  insert into public.grammar_teaching_progress (
    topic_id, scope_key, status, first_taught_at, confirmed_at, last_lesson_date, note, updated_by, updated_at
  ) values (
    v_topic_id,
    p_scope_key,
    p_status,
    case when p_status in ('needs_review', 'confirmed_complete') then v_now else null end,
    case when p_status = 'confirmed_complete' then v_now else null end,
    p_lesson_date,
    coalesce(p_note, ''),
    (select auth.uid()),
    v_now
  )
  on conflict (topic_id, scope_key) do update set
    status = excluded.status,
    first_taught_at = coalesce(public.grammar_teaching_progress.first_taught_at, excluded.first_taught_at),
    confirmed_at = case when excluded.status = 'confirmed_complete' then v_now else public.grammar_teaching_progress.confirmed_at end,
    last_lesson_date = coalesce(excluded.last_lesson_date, public.grammar_teaching_progress.last_lesson_date),
    note = excluded.note,
    updated_by = excluded.updated_by,
    updated_at = v_now;

  insert into public.grammar_progress_events (
    topic_id, scope_key, old_status, new_status, lesson_date, note, created_by
  ) values (
    v_topic_id, p_scope_key, v_old_status, p_status, p_lesson_date, coalesce(p_note, ''), (select auth.uid())
  );

  return jsonb_build_object('status', 'saved', 'topicKey', p_topic_key, 'oldStatus', v_old_status, 'newStatus', p_status, 'updatedAt', v_now);
end;
$$;

alter table public.grammar_topics enable row level security;
alter table public.grammar_topic_sources enable row level security;
alter table public.grammar_teaching_progress enable row level security;
alter table public.grammar_progress_events enable row level security;

create policy "grammar catalog is readable" on public.grammar_topics for select to anon, authenticated using (true);
create policy "grammar sources are readable" on public.grammar_topic_sources for select to anon, authenticated using (true);
create policy "shared grammar progress is readable" on public.grammar_teaching_progress for select to anon, authenticated using (scope_key = 'shared');
create policy "teachers insert grammar progress" on public.grammar_teaching_progress for insert to authenticated with check (scope_key = 'shared' and public.is_grammar_teacher());
create policy "teachers update grammar progress" on public.grammar_teaching_progress for update to authenticated using (scope_key = 'shared' and public.is_grammar_teacher()) with check (scope_key = 'shared' and public.is_grammar_teacher());
create policy "shared grammar events are readable" on public.grammar_progress_events for select to anon, authenticated using (scope_key = 'shared');
create policy "teachers insert grammar events" on public.grammar_progress_events for insert to authenticated with check (scope_key = 'shared' and public.is_grammar_teacher());

revoke all on table public.grammar_topics, public.grammar_topic_sources, public.grammar_teaching_progress, public.grammar_progress_events from public, anon, authenticated;
grant select on table public.grammar_topics, public.grammar_topic_sources, public.grammar_teaching_progress, public.grammar_progress_events to anon, authenticated;
grant insert, update on table public.grammar_teaching_progress to authenticated;
grant insert on table public.grammar_progress_events to authenticated;
grant usage, select on sequence public.grammar_topic_sources_id_seq, public.grammar_progress_events_id_seq to service_role;
grant usage, select on sequence public.grammar_progress_events_id_seq to authenticated;

revoke all on function public.is_grammar_teacher() from public, anon, authenticated;
grant execute on function public.is_grammar_teacher() to authenticated;
revoke all on function public.touch_grammar_updated_at() from public, anon, authenticated;
revoke all on function public.set_grammar_progress(text, text, text, date, text, boolean) from public, anon, authenticated;
grant execute on function public.set_grammar_progress(text, text, text, date, text, boolean) to authenticated;

comment on table public.grammar_topics is 'Stable grammar knowledge catalog used by the teacher knowledge library.';
comment on table public.grammar_teaching_progress is 'Runtime authority for per-topic teaching progress; shared scope is currently enabled.';
comment on function public.set_grammar_progress(text, text, text, date, text, boolean) is 'Atomically updates one grammar topic progress row and appends its history event.';
