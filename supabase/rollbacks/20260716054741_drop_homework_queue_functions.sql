begin;

drop function if exists public.retry_homework_block(uuid);
drop function if exists public.claim_next_homework_block();

commit;
