-- Install once before using scripts/sync-category-wordbook.mjs --apply.
-- The function locks kv_store.main, verifies the dry-run baseline, creates a
-- full snapshot, and replaces main in one PostgreSQL transaction.

create or replace function public.apply_reference_wordbook_atomic(
  p_expected_main jsonb,
  p_next_main jsonb,
  p_snapshot_key text,
  p_category_id text,
  p_wordbook_id text,
  p_package_sha256 text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
set statement_timeout = '15s'
as $$
declare
  v_current jsonb;
  v_target jsonb;
  v_target_count integer;
  v_missing_count integer;
begin
  if jsonb_typeof(p_expected_main) is distinct from 'object'
     or jsonb_typeof(p_next_main) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'expected and next main must be JSON objects';
  end if;
  if nullif(btrim(p_category_id), '') is null
     or nullif(btrim(p_wordbook_id), '') is null then
    raise exception using errcode = '22023', message = 'category and wordbook IDs are required';
  end if;
  if p_wordbook_id !~ '^book-[a-z0-9][a-z0-9-]*$' then
    raise exception using errcode = '22023', message = 'wordbook ID is invalid';
  end if;
  if p_snapshot_key !~ '^pre_[a-z0-9_]+_reference_import_[0-9]{4}_[0-9]{2}_[0-9]{2}_[0-9]{4}$' then
    raise exception using errcode = '22023', message = 'snapshot key is invalid';
  end if;
  if p_package_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'package sha256 is invalid';
  end if;
  if jsonb_typeof(p_next_main -> 'masterCards') is distinct from 'object'
     or jsonb_typeof(p_next_main -> 'batches') is distinct from 'array' then
    raise exception using errcode = '22023', message = 'next main has an invalid master library shape';
  end if;

  select value
  into v_current
  from public.kv_store
  where key = 'main'
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'kv_store.main does not exist';
  end if;
  if v_current = p_next_main then
    return jsonb_build_object(
      'status', 'already_applied',
      'wordbookId', p_wordbook_id,
      'packageSha256', p_package_sha256
    );
  end if;
  if v_current <> p_expected_main then
    raise exception using errcode = '40001', message = 'kv_store.main changed after dry-run';
  end if;

  select count(*)
  into v_target_count
  from jsonb_array_elements(p_next_main -> 'batches') as item(batch)
  where batch ->> 'id' = p_wordbook_id;

  if v_target_count <> 1 then
    raise exception using errcode = '22023', message = 'target wordbook must exist exactly once';
  end if;

  select batch
  into v_target
  from jsonb_array_elements(p_next_main -> 'batches') as item(batch)
  where batch ->> 'id' = p_wordbook_id
  limit 1;
  if v_target ->> 'bookType' is distinct from 'reference'
     or v_target ->> 'bookPurpose' is distinct from 'common'
     or jsonb_typeof(v_target -> 'cardRefs') is distinct from 'array'
     or jsonb_array_length(v_target -> 'cardRefs') = 0 then
    raise exception using errcode = '22023', message = 'target wordbook is not a valid common reference wordbook';
  end if;
  if v_target -> 'sharedWith' <> '["sister", "brother"]'::jsonb then
    raise exception using errcode = '22023', message = 'sharedWith must be sister and brother';
  end if;
  if v_target ? 'cards' then
    raise exception using errcode = '22023', message = 'target wordbook must not persist cards';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_next_main -> 'batches') as item(batch)
    where batch ->> 'name' = v_target ->> 'name'
      and batch ->> 'id' is distinct from p_wordbook_id
  ) then
    raise exception using errcode = '23505', message = 'target wordbook name already exists under another ID';
  end if;
  if (
    select count(*)
    from jsonb_array_elements(v_target -> 'cardRefs') as item(ref)
  ) <> (
    select count(distinct lower(btrim(ref ->> 'wordKey')))
    from jsonb_array_elements(v_target -> 'cardRefs') as item(ref)
  ) then
    raise exception using errcode = '23505', message = 'target wordbook contains duplicate normalized references';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_next_main -> 'batches') as item(batch)
    where batch ? 'cards'
  ) then
    raise exception using errcode = '22023', message = 'no wordbook may persist full cards';
  end if;

  select count(*)
  into v_missing_count
  from jsonb_array_elements(v_target -> 'cardRefs') as item(ref)
  where nullif(btrim(ref ->> 'wordKey'), '') is null
     or not ((p_next_main -> 'masterCards') ? (ref ->> 'wordKey'));

  if v_missing_count <> 0 then
    raise exception using errcode = '22023', message = 'target wordbook contains missing references';
  end if;
  if exists (select 1 from public.kv_store where key = p_snapshot_key) then
    raise exception using errcode = '23505', message = 'snapshot key already exists';
  end if;

  insert into public.kv_store(key, value)
  values (p_snapshot_key, v_current);

  update public.kv_store
  set value = p_next_main
  where key = 'main';

  if not found then
    raise exception using errcode = 'P0002', message = 'kv_store.main disappeared during transaction';
  end if;

  return jsonb_build_object(
    'status', 'applied',
    'categoryId', p_category_id,
    'wordbookId', p_wordbook_id,
    'snapshotKey', p_snapshot_key,
    'packageSha256', p_package_sha256,
    'referenceCount', jsonb_array_length(v_target -> 'cardRefs')
  );
end;
$$;

revoke all on function public.apply_reference_wordbook_atomic(jsonb, jsonb, text, text, text, text) from public;
grant execute on function public.apply_reference_wordbook_atomic(jsonb, jsonb, text, text, text, text) to anon, authenticated;

comment on function public.apply_reference_wordbook_atomic(jsonb, jsonb, text, text, text, text) is
  'Atomically snapshots and applies one audited category reference-wordbook plan.';
