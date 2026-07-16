import assert from 'node:assert/strict';
import test from 'node:test';

import { hasTeacherRole, requireTeacher } from '../supabase/functions/homework-worker/lib/auth.ts';
import { loadWorkerConfig } from '../supabase/functions/homework-worker/lib/config.ts';
import { HomeworkWorkerError } from '../supabase/functions/homework-worker/lib/errors.ts';
import { processNextBlock, retryBlock } from '../supabase/functions/homework-worker/lib/queue.ts';
import {
  assertAllowedStoragePath,
  assertPageInRange,
  downloadPrivatePdf,
} from '../supabase/functions/homework-worker/lib/storage.ts';

function config(overrides = {}) {
  return {
    supabaseUrl: 'https://project.supabase.co',
    supabaseServiceRoleKey: 'server-secret-value',
    storageBucket: 'homework-source-files',
    storagePrefix: 'homework-prep/',
    maxPdfBytes: 1024,
    downloadTimeoutMs: 50,
    allowedOrigins: ['https://xxzdecode.github.io'],
    ...overrides,
  };
}

function pdfResponse(body = '%PDF-1.7\nmock') {
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-length': String(new TextEncoder().encode(body).byteLength),
    },
  });
}

function expectWorkerError(callback, code) {
  assert.throws(callback, (error) => {
    assert.equal(error instanceof HomeworkWorkerError, true);
    assert.equal(error.code, code);
    return true;
  });
}

test('worker config keeps service credentials server-side and normalizes defaults', () => {
  const values = new Map([
    ['SUPABASE_URL', 'https://project.supabase.co/'],
    ['SUPABASE_SERVICE_ROLE_KEY', 'secret'],
  ]);
  const loaded = loadWorkerConfig((name) => values.get(name));

  assert.equal(loaded.supabaseUrl, 'https://project.supabase.co');
  assert.equal(loaded.storageBucket, 'homework-source-files');
  assert.equal(loaded.storagePrefix, 'homework-prep/');
  assert.equal(loaded.maxPdfBytes, 40 * 1024 * 1024);
});

test('teacher authorization uses app_metadata and rejects user_metadata', () => {
  assert.equal(hasTeacherRole({ app_metadata: { role: 'teacher' } }), true);
  assert.equal(hasTeacherRole({ app_metadata: { roles: ['teacher'] } }), true);
  assert.equal(hasTeacherRole({ user_metadata: { role: 'teacher' } }), false);
  expectWorkerError(() => requireTeacher({ user_metadata: { role: 'teacher' } }), 'teacher_access_required');
});

test('storage path guard accepts only a direct PDF inside the configured prefix', () => {
  assert.doesNotThrow(() => assertAllowedStoragePath('homework-prep/homework-test-1.pdf', 'homework-prep/'));
  expectWorkerError(
    () => assertAllowedStoragePath('homework-prep/../private.pdf', 'homework-prep/'),
    'invalid_storage_path',
  );
  expectWorkerError(
    () => assertAllowedStoragePath('other/homework-test-1.pdf', 'homework-prep/'),
    'invalid_storage_path',
  );
  expectWorkerError(
    () => assertAllowedStoragePath('homework-prep/nested/file.pdf', 'homework-prep/'),
    'invalid_storage_path',
  );
  expectWorkerError(
    () => assertAllowedStoragePath('homework-prep/file.png', 'homework-prep/'),
    'invalid_storage_path',
  );
});

test('private PDF download sends the secret only in server request headers', async () => {
  let capturedUrl = '';
  let capturedOptions;
  const bytes = await downloadPrivatePdf({
    storagePath: 'homework-prep/homework-test-1.pdf',
    config: config(),
    fetchImpl: async (url, options) => {
      capturedUrl = String(url);
      capturedOptions = options;
      return pdfResponse();
    },
  });

  assert.equal(new TextDecoder().decode(bytes).startsWith('%PDF-'), true);
  assert.equal(capturedUrl.includes('server-secret-value'), false);
  assert.equal(capturedOptions.headers.apikey, 'server-secret-value');
  assert.equal(capturedOptions.headers.Authorization, 'Bearer server-secret-value');
});

test('private PDF download maps missing, denied, MIME, size and corruption errors', async () => {
  const cases = [
    [new Response('', { status: 404 }), 'storage_object_not_found'],
    [new Response('', { status: 403 }), 'storage_access_denied'],
    [new Response('not pdf', { status: 200, headers: { 'content-type': 'text/plain' } }), 'storage_object_not_pdf'],
    [new Response('%PDF-large', {
      status: 200,
      headers: { 'content-type': 'application/pdf', 'content-length': '2048' },
    }), 'storage_pdf_too_large'],
    [new Response('broken', {
      status: 200,
      headers: { 'content-type': 'application/pdf' },
    }), 'storage_pdf_corrupt'],
  ];

  for (const [response, expectedCode] of cases) {
    await assert.rejects(
      downloadPrivatePdf({
        storagePath: 'homework-prep/homework-test-1.pdf',
        config: config(),
        fetchImpl: async () => response,
      }),
      (error) => error instanceof HomeworkWorkerError && error.code === expectedCode,
    );
  }
});

test('private PDF download aborts on timeout without exposing credentials', async () => {
  await assert.rejects(
    downloadPrivatePdf({
      storagePath: 'homework-prep/homework-test-1.pdf',
      config: config({ downloadTimeoutMs: 5 }),
      fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      }),
    }),
    (error) => {
      assert.equal(error.code, 'storage_timeout');
      assert.equal(error.message.includes('server-secret-value'), false);
      return true;
    },
  );
});

test('page range guard rejects invalid and out-of-range pages', () => {
  assert.doesNotThrow(() => assertPageInRange(3, 3));
  expectWorkerError(() => assertPageInRange(0, 3), 'page_out_of_range');
  expectWorkerError(() => assertPageInRange(4, 3), 'page_out_of_range');
});

test('queue helpers call only fixed RPC names and validate retry UUIDs', async () => {
  const calls = [];
  const client = {
    async rpc(name, parameters) {
      calls.push([name, parameters]);
      return { data: { ok: true }, error: null };
    },
  };

  await processNextBlock(client);
  await retryBlock(client, '00000000-0000-4000-8000-000000000103');

  assert.deepEqual(calls, [
    ['claim_next_homework_block', undefined],
    ['retry_homework_block', { p_block_id: '00000000-0000-4000-8000-000000000103' }],
  ]);
  await assert.rejects(
    retryBlock(client, 'not-a-uuid'),
    (error) => error.code === 'invalid_block_id',
  );
});
