-- Destructive manual rollback for 20260716053512_create_homework_prep_schema.sql.
-- Run only after exporting any homework-prep data that must be retained.

begin;

drop table if exists public.review_items;
drop table if exists public.processing_tasks;
drop table if exists public.teaching_analysis;
drop table if exists public.questions;
drop table if exists public.block_sources;
drop table if exists public.homework_blocks;
drop table if exists public.documents;
drop function if exists public.set_homework_updated_at();
drop type if exists public.homework_status;

commit;
