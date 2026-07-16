begin;

insert into public.documents (
  id,
  business_type,
  storage_path,
  file_name,
  file_size,
  version,
  status
)
values
  (
    '00000000-0000-4000-8000-000000000001',
    'schedule',
    'homework-prep/homework-indice.pdf',
    'homework-indice.pdf',
    9262165,
    1,
    'completed'
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'numbered_exercises',
    'homework-prep/homework-test-1.pdf',
    'homework-test-1.pdf',
    28677783,
    1,
    'ready'
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    'numbered_exercises',
    'homework-prep/homework-test-2.pdf',
    'homework-test-2.pdf',
    26656137,
    1,
    'ready'
  ),
  (
    '00000000-0000-4000-8000-000000000004',
    'close_reading',
    'homework-prep/homework-read.pdf',
    'homework-read.pdf',
    30892547,
    1,
    'paused'
  )
on conflict (id) do update
set
  business_type = excluded.business_type,
  storage_path = excluded.storage_path,
  file_name = excluded.file_name,
  file_size = excluded.file_size,
  version = excluded.version,
  status = excluded.status;

insert into public.homework_blocks (
  id,
  block_code,
  number_start,
  number_end,
  schedule_date_text,
  schedule_pdf_page,
  status,
  review_count
)
values
  ('00000000-0000-4000-8000-000000000101', 'BLOCK-001', 1, 4, '7 月 1 日–2 日', 1, 'ready', 0),
  ('00000000-0000-4000-8000-000000000102', 'BLOCK-002', 5, 8, '7 月 8 日–9 日', 1, 'ready', 0),
  ('00000000-0000-4000-8000-000000000103', 'BLOCK-003', 9, 12, '7 月 15 日–16 日', 1, 'pending', 0),
  ('00000000-0000-4000-8000-000000000104', 'BLOCK-004', 13, 16, '7 月 22 日–23 日', 1, 'pending', 0),
  ('00000000-0000-4000-8000-000000000105', 'BLOCK-005', 17, 19, '7 月 29 日–30 日', 2, 'pending', 0),
  ('00000000-0000-4000-8000-000000000106', 'BLOCK-006', 20, 22, '8 月 5 日–6 日', 2, 'pending', 0),
  ('00000000-0000-4000-8000-000000000107', 'BLOCK-007', 23, 25, '8 月 12 日–13 日', 2, 'pending', 0),
  ('00000000-0000-4000-8000-000000000108', 'BLOCK-008', 26, 28, '8 月 19 日–20 日', 2, 'pending', 0),
  ('00000000-0000-4000-8000-000000000109', 'BLOCK-009', 29, 30, '8 月 25 日', 2, 'pending', 0)
on conflict (id) do update
set
  block_code = excluded.block_code,
  number_start = excluded.number_start,
  number_end = excluded.number_end,
  schedule_date_text = excluded.schedule_date_text,
  schedule_pdf_page = excluded.schedule_pdf_page,
  status = excluded.status,
  review_count = excluded.review_count;

insert into public.block_sources (
  id,
  block_id,
  document_id,
  pdf_page_start,
  pdf_page_end,
  page_region,
  cross_page,
  cross_document
)
values
  (
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000002',
    1,
    3,
    null,
    true,
    false
  ),
  (
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-000000000002',
    4,
    6,
    null,
    true,
    false
  ),
  (
    '00000000-0000-4000-8000-000000000203',
    '00000000-0000-4000-8000-000000000103',
    '00000000-0000-4000-8000-000000000002',
    null,
    null,
    null,
    false,
    false
  ),
  (
    '00000000-0000-4000-8000-000000000204',
    '00000000-0000-4000-8000-000000000104',
    '00000000-0000-4000-8000-000000000002',
    null,
    null,
    null,
    false,
    false
  ),
  (
    '00000000-0000-4000-8000-000000000205',
    '00000000-0000-4000-8000-000000000105',
    '00000000-0000-4000-8000-000000000003',
    null,
    null,
    null,
    false,
    false
  ),
  (
    '00000000-0000-4000-8000-000000000206',
    '00000000-0000-4000-8000-000000000106',
    '00000000-0000-4000-8000-000000000003',
    null,
    null,
    null,
    false,
    false
  ),
  (
    '00000000-0000-4000-8000-000000000207',
    '00000000-0000-4000-8000-000000000107',
    '00000000-0000-4000-8000-000000000003',
    null,
    null,
    null,
    false,
    false
  ),
  (
    '00000000-0000-4000-8000-000000000208',
    '00000000-0000-4000-8000-000000000108',
    '00000000-0000-4000-8000-000000000003',
    null,
    null,
    null,
    false,
    false
  ),
  (
    '00000000-0000-4000-8000-000000000209',
    '00000000-0000-4000-8000-000000000109',
    '00000000-0000-4000-8000-000000000003',
    null,
    null,
    null,
    false,
    false
  )
on conflict (id) do update
set
  block_id = excluded.block_id,
  document_id = excluded.document_id,
  pdf_page_start = excluded.pdf_page_start,
  pdf_page_end = excluded.pdf_page_end,
  page_region = excluded.page_region,
  cross_page = excluded.cross_page,
  cross_document = excluded.cross_document;

commit;
