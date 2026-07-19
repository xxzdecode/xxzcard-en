-- Install once before using scripts/create-wordbook.mjs --apply.
-- The function locks kv_store.main, performs all idempotency checks again,
-- and appends exactly one batch in the same PostgreSQL transaction.

create or replace function public.create_wordbook_atomic(
  p_task_id text,
  p_batch jsonb,
  p_card_fingerprints jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
set statement_timeout = '10s'
as $$
declare
  v_data jsonb;
  v_batches jsonb;
  v_existing jsonb;
  v_existing_fingerprints jsonb;
  v_batch_words text[];
  v_existing_words text[];
  v_overlap text;
begin
  if nullif(btrim(p_task_id), '') is null then
    raise exception using errcode = '22023', message = 'taskId must not be empty';
  end if;
  if jsonb_typeof(p_batch) is distinct from 'object'
     or jsonb_typeof(p_batch -> 'cards') is distinct from 'array'
     or jsonb_array_length(p_batch -> 'cards') = 0 then
    raise exception using errcode = '22023', message = 'batch.cards must be a non-empty array';
  end if;
  if p_batch #>> '{automation,taskId}' is distinct from p_task_id then
    raise exception using errcode = '22023', message = 'batch automation taskId mismatch';
  end if;
  if p_batch -> 'sharedWith' <> '["sister", "brother"]'::jsonb then
    raise exception using errcode = '22023', message = 'sharedWith must be sister and brother';
  end if;
  if jsonb_typeof(p_card_fingerprints) is distinct from 'array'
     or p_card_fingerprints <> p_batch #> '{automation,cardFingerprints}'
     or jsonb_array_length(p_card_fingerprints) <> jsonb_array_length(p_batch -> 'cards') then
    raise exception using errcode = '22023', message = 'card fingerprint list mismatch';
  end if;
  if (
    select count(*) from jsonb_array_elements_text(p_card_fingerprints)
  ) <> (
    select count(distinct fingerprint)
    from jsonb_array_elements_text(p_card_fingerprints) as item(fingerprint)
  ) then
    raise exception using errcode = '23505', message = 'duplicate card fingerprints in request';
  end if;

  select value
  into v_data
  from public.kv_store
  where key = 'main'
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'kv_store.main does not exist';
  end if;
  if jsonb_typeof(v_data -> 'batches') <> 'array' then
    raise exception using errcode = '22023', message = 'kv_store.main.value.batches is invalid';
  end if;
  v_batches := v_data -> 'batches';

  select batch
  into v_existing
  from jsonb_array_elements(v_batches) as item(batch)
  where batch #>> '{automation,taskId}' = p_task_id
  limit 1;

  if v_existing is not null then
    v_existing_fingerprints := v_existing #> '{automation,cardFingerprints}';
    if v_existing ->> 'id' = p_batch ->> 'id'
       and v_existing #>> '{automation,title}' = p_batch #>> '{automation,title}'
       and v_existing_fingerprints = p_card_fingerprints then
      return jsonb_build_object(
        'status', 'already_applied',
        'batchId', v_existing ->> 'id',
        'cardCount', jsonb_array_length(v_existing -> 'cards')
      );
    end if;
    raise exception using errcode = '23505', message = 'taskId already exists with different payload';
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_batches) as item(batch)
    where batch ->> 'name' = p_batch ->> 'name'
  ) then
    raise exception using errcode = '23505', message = 'batch name already exists';
  end if;
  if exists (
    select 1 from jsonb_array_elements(v_batches) as item(batch)
    where batch ->> 'id' = p_batch ->> 'id'
  ) then
    raise exception using errcode = '23505', message = 'batch id already exists';
  end if;

  select array_agg(lower(btrim(card ->> 'word')) order by lower(btrim(card ->> 'word')))
  into v_batch_words
  from jsonb_array_elements(p_batch -> 'cards') as item(card);

  if array_length(v_batch_words, 1) is distinct from (
    select count(distinct word) from unnest(v_batch_words) as item(word)
  ) then
    raise exception using errcode = '23505', message = 'duplicate normalized words in request';
  end if;

  select array_agg(distinct lower(btrim(card ->> 'word')))
  into v_existing_words
  from jsonb_array_elements(v_batches) as batch_item(batch)
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(batch -> 'cards') = 'array' then batch -> 'cards' else '[]'::jsonb end
  ) as card_item(card);

  if coalesce(v_existing_words, array[]::text[]) && v_batch_words then
    raise exception using errcode = '23505', message = 'one or more normalized words already exist';
  end if;

  select requested.fingerprint
  into v_overlap
  from jsonb_array_elements_text(p_card_fingerprints) as requested(fingerprint)
  join lateral (
    select stored.fingerprint
    from jsonb_array_elements(v_batches) as batch_item(batch)
    cross join lateral jsonb_array_elements_text(
      case
        when jsonb_typeof(batch #> '{automation,cardFingerprints}') = 'array'
          then batch #> '{automation,cardFingerprints}'
        else '[]'::jsonb
      end
    ) as stored(fingerprint)
  ) existing on existing.fingerprint = requested.fingerprint
  limit 1;

  if v_overlap is not null then
    raise exception using errcode = '23505', message = 'card fingerprint already exists';
  end if;

  update public.kv_store
  set value = jsonb_set(v_data, '{batches}', v_batches || jsonb_build_array(p_batch), false)
  where key = 'main';

  if not found then
    raise exception using errcode = 'P0002', message = 'kv_store.main disappeared during transaction';
  end if;

  return jsonb_build_object(
    'status', 'applied',
    'batchId', p_batch ->> 'id',
    'cardCount', jsonb_array_length(p_batch -> 'cards')
  );
end;
$$;

revoke all on function public.create_wordbook_atomic(text, jsonb, jsonb) from public;
grant execute on function public.create_wordbook_atomic(text, jsonb, jsonb) to anon, authenticated;

comment on function public.create_wordbook_atomic(text, jsonb, jsonb) is
  'Atomically creates one wordbook batch with task, name, word and fingerprint idempotency checks.';
