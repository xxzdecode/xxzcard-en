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
  ('00000000-0000-4000-8000-000000000103', 'BLOCK-003', 9, 12, '7 月 15 日–16 日', 1, 'ready', 0),
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
    7,
    9,
    '{"coordinate_system":"normalized","pages":[7,8,9],"x":0,"y":0,"width":1,"height":1}'::jsonb,
    true,
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

insert into public.questions (
  id, block_id, homework_number, section_order, question_order, question_type,
  printed_prompt, hint_word, candidate_answers, answer_reason,
  source_page, source_region, confidence_status
)
values
  (
    '00000000-0000-4000-8000-000000000301',
    '00000000-0000-4000-8000-000000000101',
    2, 2, 5, 'word_bank_fill',
    'By the end of the day, they had planted ______ trees.', null,
    '["a hundred"]'::jsonb,
    'Standard English requires “a hundred”; the printed word bank appears to omit “a”.',
    2, '{"coordinate_system":"normalized","x":0,"y":0,"width":1,"height":1}'::jsonb, 'high'
  ),
  (
    '00000000-0000-4000-8000-000000000302',
    '00000000-0000-4000-8000-000000000101',
    4, 1, 5, 'verb_form',
    'They ______ (visit) their grandparents next week.', 'visit',
    '["will visit","are going to visit","are visiting"]'::jsonb,
    'The default school answer is “will visit”; other future forms remain acceptable when context supports them.',
    3, '{"coordinate_system":"normalized","x":0,"y":0,"width":1,"height":1}'::jsonb, 'high'
  )
on conflict (id) do update
set
  printed_prompt = excluded.printed_prompt,
  candidate_answers = excluded.candidate_answers,
  answer_reason = excluded.answer_reason,
  source_page = excluded.source_page,
  source_region = excluded.source_region,
  confidence_status = excluded.confidence_status;

insert into public.review_items (
  id, block_id, question_id, review_type, problem_summary, source_page,
  source_region, candidate_options, teacher_decision, status
)
values
  (
    '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000301',
    'suspected_print_error', 'R-001｜The word bank appears to omit the article “a”.', 2,
    '{"coordinate_system":"normalized","x":0,"y":0,"width":1,"height":1}'::jsonb,
    '["a hundred","hundred"]'::jsonb,
    '{"decision":"Use a hundred and retain the suspected omission note."}'::jsonb,
    'completed'
  ),
  (
    '00000000-0000-4000-8000-000000000402',
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000302',
    'multiple_answers', 'R-002｜The future-time sentence permits more than one reasonable form.', 3,
    '{"coordinate_system":"normalized","x":0,"y":0,"width":1,"height":1}'::jsonb,
    '["will visit","are going to visit","are visiting"]'::jsonb,
    '{"decision":"Default to will visit and retain the other reasonable future forms."}'::jsonb,
    'completed'
  )
on conflict (id) do update
set
  problem_summary = excluded.problem_summary,
  candidate_options = excluded.candidate_options,
  teacher_decision = excluded.teacher_decision,
  status = excluded.status;

insert into public.questions (
  id, block_id, homework_number, section_order, question_order, question_type,
  printed_prompt, candidate_answers, answer_reason,
  source_page, source_region, confidence_status
)
values
  (
    '00000000-0000-4000-8000-000000000311', '00000000-0000-4000-8000-000000000103',
    9, 0, 0, 'aggregate_replay_fixture',
    '编号 9｜6 个词形转换、6 个阅读题、3 道翻译题；印刷原文由 C06–C07 真值产物追溯。',
    '["strength","reliable","pollution","bravery","comfortable","humorous",{"option":"C","answer":"Australia"},{"option":"C","answer":"three months"},{"option":"B","answer":"never sleeps"},{"option":"C","answer":"traditional Chinese opera"},{"option":"B","answer":"Shanghai Disney"},{"option":"C","answer":"Chinese culture"},["In traditional Chinese culture, family harmony is regarded as one of the most important things.","In traditional Chinese beliefs, family harmony is considered one of the most important matters."],["No matter what setbacks we encounter, we should stick to our dreams.","Whatever difficulties we face, we must hold on to our dreams."],["After years of hard work, he finally achieved his goal.","Through years of effort, he finally realized his goal."]]'::jsonb,
    '15 个候选作答点均来自已确认的 C08–C09 夹具；翻译保留两个合理表达。',
    7, '{"coordinate_system":"normalized","pages":[7],"x":0,"y":0,"width":1,"height":1}'::jsonb, 'high'
  ),
  (
    '00000000-0000-4000-8000-000000000312', '00000000-0000-4000-8000-000000000103',
    10, 0, 0, 'aggregate_replay_fixture',
    '编号 10｜6 个词形转换、6 个完形题、3 道翻译题；印刷原文由 C06–C07 真值产物追溯。',
    '["laughed","reminds","sheep","polluted","will get","proud",{"option":"C","answer":"photography"},{"option":"B","answer":"terrible"},{"option":"D","answer":"angles"},{"option":"B","answer":"difficult"},{"option":"C","answer":"wonderful"},{"option":"A","answer":"favorite"},["When we reached the top of the mountain, we were deeply attracted by the magnificent scenery before us.","When we arrived at the mountaintop, the magnificent view before our eyes deeply impressed us."],["To realize his dream, he studies hard late into the night every day.","In order to achieve his dream, he works hard at his studies late into the night every day."],["This town is famous around the world for its ancient buildings and unique culture.","The town is world-famous for its old architecture and distinctive culture."]]'::jsonb,
    '15 个候选作答点均来自已确认的 C08–C09 夹具。',
    8, '{"coordinate_system":"normalized","pages":[8],"x":0,"y":0,"width":1,"height":1}'::jsonb, 'high'
  ),
  (
    '00000000-0000-4000-8000-000000000313', '00000000-0000-4000-8000-000000000103',
    11, 0, 0, 'aggregate_replay_fixture',
    '编号 11｜6 个词形转换、6 个选词题、3 道翻译题；印刷原文跨第 8–9 页。',
    '["rapid","deeply","invention","scientific","balanced","wisdom",{"option":"A","answer":"set up"},{"option":"F","answer":"completely"},{"option":"B","answer":"stories"},{"option":"C","answer":"guessed"},{"option":"E","answer":"woke up"},{"option":"D","answer":"wonderful"},["Traditional Chinese food is famous around the world for its unique flavors and rich variety.","Chinese cuisine is world-famous for its distinctive tastes and rich variety."],["No matter what difficulties we encounter, we should maintain a positive and optimistic attitude.","Whatever problems we face, we should stay positive and optimistic."],["Through persistent effort, he finally won first place in the competition.","By working tirelessly, he finally came first in the competition."]]'::jsonb,
    '编号 11 已按 C09 结论合并第 8–9 页，15 个候选作答点完整。',
    8, '{"coordinate_system":"normalized","pages":[8,9],"x":0,"y":0,"width":1,"height":1}'::jsonb, 'high'
  ),
  (
    '00000000-0000-4000-8000-000000000314', '00000000-0000-4000-8000-000000000103',
    12, 0, 0, 'aggregate_replay_fixture',
    '编号 12｜6 个词形转换、6 个完形题、3 道翻译题；印刷原文由 C06–C07 真值产物追溯。',
    '["strength","Traditional","sadness","rapidly","kindness","Historical",{"option":"A","answer":"against"},{"option":"A","answer":"paddle"},{"option":"D","answer":"to fold"},{"option":"C","answer":"attracting"},{"option":"C","answer":"how"},{"option":"B","answer":"us"},["Dragon boat racing at the Dragon Boat Festival is not only a sporting event, but also a way to pass on the spirit of patriotism.","The Dragon Boat Festival race is more than a sport; it also carries forward the patriotic spirit."],["Young people share innovative zongzi recipes through social media, bringing new life to the traditional food.","By sharing creative zongzi recipes on social media, young people have given the traditional food new vitality."],["The craft of making scented sachets has been on the intangible cultural heritage protection list for ten years.","The craft of making scented sachets was added to the intangible cultural heritage protection list ten years ago."]]'::jsonb,
    '15 个候选作答点均来自已确认的 C08–C09 夹具；翻译保留表达边界。',
    9, '{"coordinate_system":"normalized","pages":[9],"x":0,"y":0,"width":1,"height":1}'::jsonb, 'high'
  )
on conflict (id) do update
set
  printed_prompt = excluded.printed_prompt,
  candidate_answers = excluded.candidate_answers,
  answer_reason = excluded.answer_reason,
  source_page = excluded.source_page,
  source_region = excluded.source_region,
  confidence_status = excluded.confidence_status;

insert into public.teaching_analysis (
  question_id, primary_grammar, secondary_grammar, vocabulary_candidates,
  phrase_candidates, difficulty_flag, teaching_note, suggested_order
)
values
  ('00000000-0000-4000-8000-000000000311', '["word formation","reading evidence","translation boundaries"]', '["be regarded as","no matter what","achieve a goal"]', '[]', '["one of the most important things","stick to our dreams"]', 'mixed', '先做词形词族，再练阅读定位，最后处理翻译骨架。', 1),
  ('00000000-0000-4000-8000-000000000312', '["past simple","third-person singular","first conditional"]', '["zero plural","past participle adjective"]', '[]', '["be proud of","be famous for"]', 'mixed', '对比 laughed、reminds 与 If ... will ...，再完成上下文选词。', 2),
  ('00000000-0000-4000-8000-000000000313', '["word formation","fixed collocations","translation boundaries"]', '["adverb formation","past narrative"]', '[]', '["set up a tent","tell stories","come first"]', 'mixed', '编号 11 跨页；先合并原题，再做词性、固定搭配和翻译。', 3),
  ('00000000-0000-4000-8000-000000000314', '["word formation","non-finite verb","object pronoun"]', '["capitalization","present perfect duration"]', '[]', '["in protest against","teach sb. to do","how to do"]', 'mixed', '重点核对句首大写、attracting 和 has been on ... for ten years。', 4)
on conflict (question_id) do update
set
  primary_grammar = excluded.primary_grammar,
  secondary_grammar = excluded.secondary_grammar,
  phrase_candidates = excluded.phrase_candidates,
  difficulty_flag = excluded.difficulty_flag,
  teaching_note = excluded.teaching_note,
  suggested_order = excluded.suggested_order;

insert into public.processing_tasks (
  block_id, step_name, status, attempt_count, input_snapshot, output_snapshot,
  started_at, finished_at
)
values
  ('00000000-0000-4000-8000-000000000103', 'locating', 'completed', 1, '{"number_start":9,"number_end":12}', '{"pdf_pages":[7,8,9],"cross_page_number":11}', '2026-07-16T00:00:00Z', '2026-07-16T00:00:01Z'),
  ('00000000-0000-4000-8000-000000000103', 'extracting', 'completed', 1, '{"pdf_pages":[7,8,9]}', '{"answer_points":60,"handwriting_ignored":true}', '2026-07-16T00:00:01Z', '2026-07-16T00:00:02Z'),
  ('00000000-0000-4000-8000-000000000103', 'analyzing', 'completed', 1, '{"answer_points":60}', '{"objective_points":48,"translation_points":12}', '2026-07-16T00:00:02Z', '2026-07-16T00:00:03Z'),
  ('00000000-0000-4000-8000-000000000103', 'qa', 'completed', 1, '{"answer_points":60}', '{"status":"passed","review_item_count":0,"teacher_confirmed":true}', '2026-07-16T00:00:03Z', '2026-07-16T00:00:04Z')
on conflict (block_id, step_name) do update
set
  status = excluded.status,
  attempt_count = excluded.attempt_count,
  input_snapshot = excluded.input_snapshot,
  output_snapshot = excluded.output_snapshot,
  error_code = null,
  error_message = null,
  started_at = excluded.started_at,
  finished_at = excluded.finished_at;

insert into public.homework_audit_events (
  block_id, event_type, step_name, summary, created_at
)
values
  ('00000000-0000-4000-8000-000000000103', 'step_completed', 'locating', '{"pdf_pages":[7,8,9],"cross_page_number":11}', '2026-07-16T00:00:01Z'),
  ('00000000-0000-4000-8000-000000000103', 'step_completed', 'extracting', '{"answer_points":60,"handwriting_ignored":true}', '2026-07-16T00:00:02Z'),
  ('00000000-0000-4000-8000-000000000103', 'step_completed', 'analyzing', '{"objective_points":48,"translation_points":12}', '2026-07-16T00:00:03Z'),
  ('00000000-0000-4000-8000-000000000103', 'step_completed', 'qa', '{"status":"passed","review_item_count":0}', '2026-07-16T00:00:04Z'),
  ('00000000-0000-4000-8000-000000000103', 'teacher_content_confirmed', null, '{"decision":"approved","confirmed_at":"2026-07-16","commit":"4aac44b7a1c888c5da60842d1012edf3a5866678"}', '2026-07-16T00:00:05Z'),
  ('00000000-0000-4000-8000-000000000103', 'block_confirmed_ready', null, '{"acceptance":"C10-C12","review_item_count":0}', '2026-07-16T00:00:06Z')
on conflict do nothing;

commit;
