begin;

alter table public.processing_tasks
  add column duration_ms bigint generated always as (
    case
      when started_at is not null and finished_at is not null
        then greatest(0, (extract(epoch from (finished_at - started_at)) * 1000)::bigint)
      else null
    end
  ) stored;

create table public.homework_audit_events (
  id bigint generated always as identity primary key,
  block_id uuid not null references public.homework_blocks(id) on delete cascade,
  task_id uuid references public.processing_tasks(id) on delete set null,
  review_item_id uuid references public.review_items(id) on delete set null,
  actor_user_id uuid,
  event_type text not null,
  step_name text,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint homework_audit_event_type_not_blank check (btrim(event_type) <> ''),
  constraint homework_audit_step_valid check (
    step_name is null or step_name in ('locating', 'extracting', 'analyzing', 'qa')
  ),
  constraint homework_audit_summary_is_object check (jsonb_typeof(summary) = 'object')
);

create index homework_audit_events_timeline_idx
  on public.homework_audit_events (block_id, created_at, id);

create unique index homework_audit_events_seed_unique_idx
  on public.homework_audit_events (
    block_id,
    event_type,
    coalesce(step_name, ''),
    created_at
  );

alter table public.homework_audit_events enable row level security;
revoke all on table public.homework_audit_events from anon, authenticated;
revoke all on sequence public.homework_audit_events_id_seq from anon, authenticated;
grant select, insert, update, delete on table public.homework_audit_events to service_role;
grant usage, select on sequence public.homework_audit_events_id_seq to service_role;

create or replace function public.start_homework_step(
  p_block_id uuid,
  p_step_name text,
  p_input_summary jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_task public.processing_tasks%rowtype;
begin
  if p_step_name not in ('locating', 'extracting', 'analyzing', 'qa') then
    raise exception using errcode = '22023', message = 'invalid homework step';
  end if;
  if jsonb_typeof(coalesce(p_input_summary, '{}'::jsonb)) <> 'object' then
    raise exception using errcode = '22023', message = 'input summary must be an object';
  end if;

  update public.processing_tasks
  set
    status = p_step_name::public.homework_status,
    attempt_count = attempt_count + 1,
    input_snapshot = coalesce(p_input_summary, '{}'::jsonb),
    output_snapshot = null,
    error_code = null,
    error_message = null,
    started_at = now(),
    finished_at = null
  where block_id = p_block_id and step_name = p_step_name
  returning * into target_task;

  if not found then
    raise exception using errcode = 'P0002', message = 'homework task not found';
  end if;

  update public.homework_blocks
  set status = p_step_name::public.homework_status
  where id = p_block_id;

  insert into public.homework_audit_events (
    block_id, task_id, event_type, step_name, summary
  ) values (
    p_block_id,
    target_task.id,
    'step_started',
    p_step_name,
    jsonb_build_object('attempt_count', target_task.attempt_count)
  );

  return to_jsonb(target_task);
end;
$$;

create or replace function public.finish_homework_step(
  p_block_id uuid,
  p_step_name text,
  p_output_summary jsonb default '{}'::jsonb,
  p_error_code text default null,
  p_error_message text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_task public.processing_tasks%rowtype;
  next_step text;
  next_status public.homework_status;
begin
  if p_step_name not in ('locating', 'extracting', 'analyzing', 'qa') then
    raise exception using errcode = '22023', message = 'invalid homework step';
  end if;
  if jsonb_typeof(coalesce(p_output_summary, '{}'::jsonb)) <> 'object' then
    raise exception using errcode = '22023', message = 'output summary must be an object';
  end if;

  select task.* into target_task
  from public.processing_tasks as task
  where task.block_id = p_block_id and task.step_name = p_step_name
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'homework task not found';
  end if;

  if p_error_code is not null then
    next_status := case when target_task.attempt_count <= 2
      then p_step_name::public.homework_status
      else 'blocked'::public.homework_status
    end;

    update public.processing_tasks
    set
      status = next_status,
      output_snapshot = coalesce(p_output_summary, '{}'::jsonb),
      error_code = left(p_error_code, 120),
      error_message = left(coalesce(p_error_message, ''), 500),
      finished_at = now()
    where id = target_task.id
    returning * into target_task;

    update public.homework_blocks set status = next_status where id = p_block_id;

    insert into public.homework_audit_events (
      block_id, task_id, event_type, step_name, summary
    ) values (
      p_block_id,
      target_task.id,
      case when next_status = 'blocked' then 'step_blocked' else 'step_retry_scheduled' end,
      p_step_name,
      jsonb_build_object(
        'attempt_count', target_task.attempt_count,
        'error_code', left(p_error_code, 120)
      )
    );
  else
    update public.processing_tasks
    set
      status = 'completed',
      output_snapshot = coalesce(p_output_summary, '{}'::jsonb),
      error_code = null,
      error_message = null,
      finished_at = now()
    where id = target_task.id
    returning * into target_task;

    next_step := case p_step_name
      when 'locating' then 'extracting'
      when 'extracting' then 'analyzing'
      when 'analyzing' then 'qa'
      else null
    end;

    update public.homework_blocks
    set status = case
      when next_step is not null then next_step::public.homework_status
      when exists (
        select 1 from public.review_items
        where block_id = p_block_id and status <> 'completed'
      ) then 'review'::public.homework_status
      else 'review'::public.homework_status
    end
    where id = p_block_id;

    insert into public.homework_audit_events (
      block_id, task_id, event_type, step_name, summary
    ) values (
      p_block_id,
      target_task.id,
      'step_completed',
      p_step_name,
      jsonb_build_object(
        'attempt_count', target_task.attempt_count,
        'duration_ms', target_task.duration_ms
      )
    );
  end if;

  return to_jsonb(target_task);
end;
$$;

create or replace function public.resolve_homework_review_item(
  p_review_item_id uuid,
  p_teacher_decision jsonb,
  p_teacher_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_item public.review_items%rowtype;
  rerun_step text;
  unresolved_count integer;
begin
  if jsonb_typeof(p_teacher_decision) <> 'object' or p_teacher_decision = '{}'::jsonb then
    raise exception using errcode = '22023', message = 'teacher decision must be a non-empty object';
  end if;

  select item.* into target_item
  from public.review_items as item
  where item.id = p_review_item_id
  for update;

  if not found then
    return jsonb_build_object('resolved', false, 'reason', 'review_item_not_found');
  end if;

  rerun_step := case
    when target_item.review_type in (
      'candidate_answer', 'multiple_answers', 'open_answer',
      'suspected_print_error', 'teaching_judgment'
    ) then 'analyzing'
    else 'qa'
  end;

  update public.review_items
  set teacher_decision = p_teacher_decision, status = 'completed'
  where id = p_review_item_id
  returning * into target_item;

  select count(*) into unresolved_count
  from public.review_items
  where block_id = target_item.block_id and status <> 'completed';

  update public.homework_blocks
  set
    review_count = unresolved_count,
    status = case
      when unresolved_count > 0 then 'review'::public.homework_status
      else rerun_step::public.homework_status
    end
  where id = target_item.block_id;

  if unresolved_count = 0 then
    update public.processing_tasks
    set
      status = case
        when rerun_step = 'analyzing' and step_name = 'analyzing' then 'analyzing'::public.homework_status
        when rerun_step = 'analyzing' and step_name = 'qa' then 'pending'::public.homework_status
        when rerun_step = 'qa' and step_name = 'qa' then 'qa'::public.homework_status
        else status
      end,
      error_code = case
        when step_name = rerun_step or (rerun_step = 'analyzing' and step_name = 'qa') then null
        else error_code
      end,
      error_message = case
        when step_name = rerun_step or (rerun_step = 'analyzing' and step_name = 'qa') then null
        else error_message
      end,
      started_at = case
        when step_name = rerun_step or (rerun_step = 'analyzing' and step_name = 'qa') then null
        else started_at
      end,
      finished_at = case
        when step_name = rerun_step or (rerun_step = 'analyzing' and step_name = 'qa') then null
        else finished_at
      end
    where block_id = target_item.block_id
      and (step_name = rerun_step or (rerun_step = 'analyzing' and step_name = 'qa'));
  end if;

  insert into public.homework_audit_events (
    block_id, review_item_id, actor_user_id, event_type, step_name, summary
  ) values (
    target_item.block_id,
    target_item.id,
    p_teacher_id,
    'review_resolved',
    rerun_step,
    jsonb_build_object(
      'review_type', target_item.review_type,
      'remaining_review_count', unresolved_count
    )
  );

  return jsonb_build_object(
    'resolved', true,
    'review_item', to_jsonb(target_item),
    'remaining_review_count', unresolved_count,
    'rerun_step', case when unresolved_count = 0 then rerun_step else null end
  );
end;
$$;

create or replace function public.confirm_homework_block_ready(
  p_block_id uuid,
  p_teacher_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_block public.homework_blocks%rowtype;
  unresolved_count integer;
  qa_complete boolean;
begin
  select block.* into target_block
  from public.homework_blocks as block
  where block.id = p_block_id
  for update;

  if not found then
    return jsonb_build_object('confirmed', false, 'reason', 'block_not_found');
  end if;
  if target_block.status = 'ready' then
    return jsonb_build_object('confirmed', false, 'reason', 'already_ready', 'block', to_jsonb(target_block));
  end if;
  if target_block.status <> 'review' then
    return jsonb_build_object('confirmed', false, 'reason', 'block_not_reviewable', 'block', to_jsonb(target_block));
  end if;

  select count(*) into unresolved_count
  from public.review_items
  where block_id = p_block_id and status <> 'completed';

  select exists (
    select 1 from public.processing_tasks
    where block_id = p_block_id and step_name = 'qa' and status = 'completed'
  ) into qa_complete;

  if unresolved_count > 0 then
    return jsonb_build_object('confirmed', false, 'reason', 'unresolved_review_items', 'count', unresolved_count);
  end if;
  if not qa_complete then
    return jsonb_build_object('confirmed', false, 'reason', 'qa_not_complete');
  end if;

  update public.homework_blocks
  set status = 'ready', review_count = 0
  where id = p_block_id
  returning * into target_block;

  insert into public.homework_audit_events (
    block_id, actor_user_id, event_type, summary
  ) values (
    p_block_id,
    p_teacher_id,
    'block_confirmed_ready',
    jsonb_build_object('block_code', target_block.block_code)
  );

  return jsonb_build_object('confirmed', true, 'block', to_jsonb(target_block));
end;
$$;

revoke all on function public.start_homework_step(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.finish_homework_step(uuid, text, jsonb, text, text) from public, anon, authenticated;
revoke all on function public.resolve_homework_review_item(uuid, jsonb, uuid) from public, anon, authenticated;
revoke all on function public.confirm_homework_block_ready(uuid, uuid) from public, anon, authenticated;
grant execute on function public.start_homework_step(uuid, text, jsonb) to service_role;
grant execute on function public.finish_homework_step(uuid, text, jsonb, text, text) to service_role;
grant execute on function public.resolve_homework_review_item(uuid, jsonb, uuid) to service_role;
grant execute on function public.confirm_homework_block_ready(uuid, uuid) to service_role;

commit;
