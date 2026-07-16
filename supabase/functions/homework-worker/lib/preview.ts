import type { SupabaseClient } from "@supabase/supabase-js";
import { PDFDocument } from "pdf-lib";
import type { WorkerConfig } from "./config.ts";
import { requireUuid } from "./dashboard.ts";
import { HomeworkWorkerError } from "./errors.ts";
import { assertPageInRange, downloadPrivatePdf } from "./storage.ts";

export async function extractSinglePagePdf(
  bytes: Uint8Array,
  pageNumber: number,
): Promise<Uint8Array> {
  let source: PDFDocument;
  try {
    source = await PDFDocument.load(bytes, { ignoreEncryption: false });
  } catch {
    throw new HomeworkWorkerError(
      "storage_pdf_corrupt",
      422,
      "The source PDF is invalid or corrupted.",
      false,
    );
  }
  assertPageInRange(pageNumber, source.getPageCount());
  const preview = await PDFDocument.create();
  const [page] = await preview.copyPages(source, [pageNumber - 1]);
  preview.addPage(page);
  return preview.save({ useObjectStreams: true });
}

export async function loadAuthorizedPagePreview(
  client: SupabaseClient,
  config: WorkerConfig,
  blockId: string,
  documentId: string,
  pageNumber: number,
): Promise<Uint8Array> {
  requireUuid(blockId, "invalid_block_id");
  requireUuid(documentId, "invalid_document_id");
  if (!Number.isSafeInteger(pageNumber) || pageNumber < 1) {
    throw new HomeworkWorkerError(
      "page_out_of_range",
      416,
      "The requested PDF page is outside the document range.",
      false,
    );
  }

  const { data, error } = await client.from("block_sources")
    .select("pdf_page_start,pdf_page_end,documents!inner(id,storage_path)")
    .eq("block_id", blockId)
    .eq("document_id", documentId);
  if (error) {
    throw new HomeworkWorkerError(
      "source_lookup_failed",
      502,
      "The source page could not be loaded.",
      true,
    );
  }
  const source = data?.find((item) => {
    const start = item.pdf_page_start;
    const end = item.pdf_page_end;
    return start !== null && end !== null && pageNumber >= start &&
      pageNumber <= end;
  });
  const document = source?.documents as unknown as {
    id: string;
    storage_path: string;
  } | undefined;
  if (!document) {
    throw new HomeworkWorkerError(
      "source_page_not_authorized",
      403,
      "The source page is not linked to this block.",
      false,
    );
  }

  const bytes = await downloadPrivatePdf({
    storagePath: document.storage_path,
    config,
  });
  return extractSinglePagePdf(bytes, pageNumber);
}
