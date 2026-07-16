begin;

create or replace function public.claim_next_homework_block()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  claimed_block public.homework_blocks%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('homework-prep:formal-block', 0)
  );

  select block.*
  into claimed_block
  from public.homework_blocks as block
  where block.status in ('locating', 'extracting', 'analyzing', 'qa')
  order by block.number_start, block.created_at
  limit 1
  for update;

  if found then
    return pg_catalog.jsonb_build_object(
      'claimed', false,
      'reason', 'already_active',
      'block', pg_catalog.to_jsonb(claimed_block)
    );
  end if;

  select block.*
  into claimed_block
  from public.homework_blocks as block
  where block.status = 'pending'
  order by block.number_start, block.created_at
  limit 1
  for update skip locked;

  if not found then
    return pg_catalog.jsonb_build_object(
      'claimed', false,
      'reason', 'no_pending_block',
      'block', null
    );
  end if;

  update public.homework_blocks
  set status = 'locating'
  where id = claimed_block.id
  returning * into claimed_block;

  insert into public.processing_tasks (block_id, step_name, status)
  values
    (claimed_block.id, 'locating', 'locating'),
    (claimed_block.id, 'extracting', 'pending'),
    (claimed_block.id, 'analyzing', 'pending'),
    (claimed_block.id, 'qa', 'pending')
  on conflict (block_id, step_name) do nothing;

  return pg_catalog.jsonb_build_object(
    'claimed', true,
    'reason', 'claimed_pending_block',
    'block', pg_catalog.to_jsonb(claimed_block)
  );
end;
$$;

create or replace function public.retry_homework_block(p_block_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_block public.homework_blocks%rowtype;
  active_block_id uuid;
  retry_step text;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('homework-prep:formal-block', 0)
  );

  select block.*
  into target_block
  from public.homework_blocks as block
  where block.id = p_block_id
  for update;

  if not found then
    return pg_catalog.jsonb_build_object(
      'retried', false,
      'reason', 'block_not_found',
      'block', null
    );
  end if;

  if target_block.status <> 'blocked' then
    return pg_catalog.jsonb_build_object(
      'retried', false,
      'reason', 'block_not_blocked',
      'block', pg_catalog.to_jsonb(target_block)
    );
  end if;

  select block.id
  into active_block_id
  from public.homework_blocks as block
  where block.id <> p_block_id
    and block.status in ('locating', 'extracting', 'analyzing', 'qa')
  order by block.number_start
  limit 1
  for update;

  if found then
    return pg_catalog.jsonb_build_object(
      'retried', false,
      'reason', 'another_block_active',
      'active_block_id', active_block_id,
      'block', pg_catalog.to_jsonb(target_block)
    );
  end if;

  select task.step_name
  into retry_step
  from public.processing_tasks as task
  where task.block_id = p_block_id
    and task.status <> 'completed'
  order by case task.step_name
    when 'locating' then 1
    when 'extracting' then 2
    when 'analyzing' then 3
    when 'qa' then 4
    else 99
  end
  limit 1
  for update;

  if not found then
    return pg_catalog.jsonb_build_object(
      'retried', false,
      'reason', 'no_retryable_step',
      'block', pg_catalog.to_jsonb(target_block)
    );
  end if;

  update public.processing_tasks
  set
    status = retry_step::public.homework_status,
    error_code = null,
    error_message = null,
    started_at = null,
    finished_at = null
  where block_id = p_block_id
    and step_name = retry_step;

  update public.homework_blocks
  set status = retry_step::public.homework_status
  where id = p_block_id
  returning * into target_block;

  return pg_catalog.jsonb_build_object(
    'retried', true,
    'reason', 'resumed_failed_step',
    'step_name', retry_step,
    'block', pg_catalog.to_jsonb(target_block)
  );
end;
$$;

revoke all on function public.claim_next_homework_block() from public, anon, authenticated;
revoke all on function public.retry_homework_block(uuid) from public, anon, authenticated;
grant execute on function public.claim_next_homework_block() to service_role;
grant execute on function public.retry_homework_block(uuid) to service_role;

commit;
