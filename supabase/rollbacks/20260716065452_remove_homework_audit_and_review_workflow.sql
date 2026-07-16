begin;

drop function if exists public.confirm_homework_block_ready(uuid, uuid);
drop function if exists public.resolve_homework_review_item(uuid, jsonb, uuid);
drop function if exists public.finish_homework_step(uuid, text, jsonb, text, text);
drop function if exists public.start_homework_step(uuid, text, jsonb);
drop table if exists public.homework_audit_events;
alter table public.processing_tasks drop column if exists duration_ms;

commit;
