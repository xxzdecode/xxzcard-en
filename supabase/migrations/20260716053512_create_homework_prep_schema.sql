begin;

create type public.homework_status as enum (
  'pending',
  'locating',
  'extracting',
  'analyzing',
  'qa',
  'review',
  'ready',
  'completed',
  'paused',
  'blocked'
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  business_type text not null,
  storage_path text not null unique,
  file_name text not null,
  file_size bigint,
  version integer not null default 1,
  status public.homework_status not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documents_business_type_not_blank check (btrim(business_type) <> ''),
  constraint documents_storage_path_not_blank check (btrim(storage_path) <> ''),
  constraint documents_storage_path_is_homework_source check (
    storage_path ~ '^homework-prep/[A-Za-z0-9][A-Za-z0-9._-]*[.]pdf$'
    and storage_path !~ '[.][.]'
  ),
  constraint documents_file_name_not_blank check (btrim(file_name) <> ''),
  constraint documents_file_name_is_pdf check (lower(file_name) like '%.pdf'),
  constraint documents_file_size_nonnegative check (file_size is null or file_size >= 0),
  constraint documents_version_positive check (version > 0)
);

create table public.homework_blocks (
  id uuid primary key default gen_random_uuid(),
  block_code text not null unique,
  number_start integer not null,
  number_end integer not null,
  schedule_date_text text,
  schedule_pdf_page integer,
  status public.homework_status not null,
  review_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint homework_blocks_code_format check (block_code ~ '^BLOCK-[0-9]{3,}$'),
  constraint homework_blocks_number_start_positive check (number_start > 0),
  constraint homework_blocks_number_range_valid check (number_end >= number_start),
  constraint homework_blocks_schedule_page_positive check (
    schedule_pdf_page is null or schedule_pdf_page > 0
  ),
  constraint homework_blocks_review_count_nonnegative check (review_count >= 0)
);

create table public.block_sources (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.homework_blocks(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete restrict,
  pdf_page_start integer,
  pdf_page_end integer,
  page_region jsonb,
  cross_page boolean not null default false,
  cross_document boolean not null default false,
  constraint block_sources_page_start_positive check (
    pdf_page_start is null or pdf_page_start > 0
  ),
  constraint block_sources_page_end_positive check (
    pdf_page_end is null or pdf_page_end > 0
  ),
  constraint block_sources_page_range_valid check (
    pdf_page_start is null
    or pdf_page_end is null
    or pdf_page_end >= pdf_page_start
  ),
  constraint block_sources_region_is_object check (
    page_region is null or jsonb_typeof(page_region) = 'object'
  )
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.homework_blocks(id) on delete cascade,
  homework_number integer not null,
  section_order integer,
  question_order integer,
  question_type text,
  printed_prompt text,
  hint_word text,
  options jsonb,
  passage_text text,
  candidate_answers jsonb,
  answer_reason text,
  source_page integer,
  source_region jsonb,
  confidence_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint questions_homework_number_positive check (homework_number > 0),
  constraint questions_section_order_nonnegative check (
    section_order is null or section_order >= 0
  ),
  constraint questions_question_order_nonnegative check (
    question_order is null or question_order >= 0
  ),
  constraint questions_options_is_array check (
    options is null or jsonb_typeof(options) = 'array'
  ),
  constraint questions_candidate_answers_is_array check (
    candidate_answers is null or jsonb_typeof(candidate_answers) = 'array'
  ),
  constraint questions_source_page_positive check (source_page is null or source_page > 0),
  constraint questions_source_region_is_object check (
    source_region is null or jsonb_typeof(source_region) = 'object'
  ),
  constraint questions_confidence_status_valid check (
    confidence_status is null
    or confidence_status in ('high', 'medium', 'low', 'unreadable')
  )
);

create table public.teaching_analysis (
  question_id uuid primary key references public.questions(id) on delete cascade,
  primary_grammar jsonb,
  secondary_grammar jsonb,
  vocabulary_candidates jsonb,
  phrase_candidates jsonb,
  difficulty_flag text,
  teaching_note text,
  suggested_order integer,
  constraint teaching_analysis_primary_grammar_is_array check (
    primary_grammar is null or jsonb_typeof(primary_grammar) = 'array'
  ),
  constraint teaching_analysis_secondary_grammar_is_array check (
    secondary_grammar is null or jsonb_typeof(secondary_grammar) = 'array'
  ),
  constraint teaching_analysis_vocabulary_is_array check (
    vocabulary_candidates is null or jsonb_typeof(vocabulary_candidates) = 'array'
  ),
  constraint teaching_analysis_phrases_is_array check (
    phrase_candidates is null or jsonb_typeof(phrase_candidates) = 'array'
  ),
  constraint teaching_analysis_suggested_order_nonnegative check (
    suggested_order is null or suggested_order >= 0
  )
);

create table public.processing_tasks (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.homework_blocks(id) on delete cascade,
  step_name text not null,
  status public.homework_status not null,
  attempt_count integer not null default 0,
  error_code text,
  error_message text,
  input_snapshot jsonb,
  output_snapshot jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  constraint processing_tasks_step_name_valid check (
    step_name in ('locating', 'extracting', 'analyzing', 'qa')
  ),
  constraint processing_tasks_attempt_count_nonnegative check (attempt_count >= 0),
  constraint processing_tasks_time_order_valid check (
    started_at is null or finished_at is null or finished_at >= started_at
  ),
  constraint processing_tasks_block_step_unique unique (block_id, step_name)
);

create table public.review_items (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.homework_blocks(id) on delete cascade,
  question_id uuid references public.questions(id) on delete set null,
  review_type text not null,
  problem_summary text not null,
  source_page integer,
  source_region jsonb,
  candidate_options jsonb,
  teacher_decision jsonb,
  status public.homework_status not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_items_type_not_blank check (btrim(review_type) <> ''),
  constraint review_items_problem_summary_not_blank check (btrim(problem_summary) <> ''),
  constraint review_items_source_page_positive check (source_page is null or source_page > 0),
  constraint review_items_source_region_is_object check (
    source_region is null or jsonb_typeof(source_region) = 'object'
  ),
  constraint review_items_candidate_options_is_array check (
    candidate_options is null or jsonb_typeof(candidate_options) = 'array'
  )
);

create unique index questions_block_position_unique_idx
  on public.questions (
    block_id,
    homework_number,
    coalesce(section_order, -1),
    coalesce(question_order, -1)
  );

create unique index block_sources_unique_source_idx
  on public.block_sources (
    block_id,
    document_id,
    coalesce(pdf_page_start, 0),
    coalesce(pdf_page_end, 0)
  );

create unique index homework_blocks_single_active_idx
  on public.homework_blocks ((true))
  where status in ('locating', 'extracting', 'analyzing', 'qa');

create index documents_business_type_status_idx
  on public.documents (business_type, status);

create index homework_blocks_queue_idx
  on public.homework_blocks (status, number_start, number_end);

create index block_sources_block_id_idx
  on public.block_sources (block_id);

create index block_sources_document_id_idx
  on public.block_sources (document_id);

create index questions_block_number_idx
  on public.questions (block_id, homework_number, section_order, question_order);

create index questions_source_idx
  on public.questions (block_id, source_page);

create index processing_tasks_status_idx
  on public.processing_tasks (block_id, status, created_at);

create index review_items_open_idx
  on public.review_items (block_id, status, created_at)
  where status not in ('ready', 'completed');

create or replace function public.set_homework_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger documents_set_updated_at
before update on public.documents
for each row execute function public.set_homework_updated_at();

create trigger homework_blocks_set_updated_at
before update on public.homework_blocks
for each row execute function public.set_homework_updated_at();

create trigger questions_set_updated_at
before update on public.questions
for each row execute function public.set_homework_updated_at();

create trigger review_items_set_updated_at
before update on public.review_items
for each row execute function public.set_homework_updated_at();

alter table public.documents enable row level security;
alter table public.homework_blocks enable row level security;
alter table public.block_sources enable row level security;
alter table public.questions enable row level security;
alter table public.teaching_analysis enable row level security;
alter table public.processing_tasks enable row level security;
alter table public.review_items enable row level security;

revoke all on table
  public.documents,
  public.homework_blocks,
  public.block_sources,
  public.questions,
  public.teaching_analysis,
  public.processing_tasks,
  public.review_items
from anon, authenticated;

grant select, insert, update, delete on table
  public.documents,
  public.homework_blocks,
  public.block_sources,
  public.questions,
  public.teaching_analysis,
  public.processing_tasks,
  public.review_items
to service_role;

revoke usage on type public.homework_status from anon, authenticated;
grant usage on type public.homework_status to service_role;

revoke all on function public.set_homework_updated_at() from public, anon, authenticated;
grant execute on function public.set_homework_updated_at() to service_role;

commit;
