import type { WorkerConfig } from "./config.ts";
import { HomeworkWorkerError } from "./errors.ts";

interface DownloadPrivatePdfOptions {
  storagePath: string;
  config: WorkerConfig;
  fetchImpl?: typeof fetch;
}

const PDF_MAGIC = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);

function hasPdfMagic(bytes: Uint8Array): boolean {
  return PDF_MAGIC.every((value, index) => bytes[index] === value);
}

function encodedObjectPath(storagePath: string): string {
  return storagePath.split("/").map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function assertAllowedStoragePath(
  storagePath: string,
  prefix: string,
): void {
  const normalizedPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;
  const fileName = storagePath.slice(normalizedPrefix.length);

  if (
    !storagePath.startsWith(normalizedPrefix) ||
    storagePath.includes("\\") ||
    storagePath.includes("..") ||
    fileName.includes("/") ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]*[.]pdf$/i.test(fileName)
  ) {
    throw new HomeworkWorkerError(
      "invalid_storage_path",
      400,
      "The requested PDF path is not allowed.",
      false,
    );
  }
}

export function assertPageInRange(pageNumber: number, pageCount: number): void {
  if (
    !Number.isSafeInteger(pageNumber) ||
    !Number.isSafeInteger(pageCount) ||
    pageNumber < 1 ||
    pageCount < 1 ||
    pageNumber > pageCount
  ) {
    throw new HomeworkWorkerError(
      "page_out_of_range",
      416,
      "The requested PDF page is outside the document range.",
      false,
    );
  }
}

export async function downloadPrivatePdf({
  storagePath,
  config,
  fetchImpl = fetch,
}: DownloadPrivatePdfOptions): Promise<Uint8Array> {
  assertAllowedStoragePath(storagePath, config.storagePrefix);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.downloadTimeoutMs);
  const url = `${config.supabaseUrl}/storage/v1/object/authenticated/${
    encodeURIComponent(config.storageBucket)
  }/${encodedObjectPath(storagePath)}`;

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers: {
        apikey: config.supabaseServiceRoleKey,
        Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
      },
      signal: controller.signal,
    });
  } catch {
    const timedOut = controller.signal.aborted;
    throw new HomeworkWorkerError(
      timedOut ? "storage_timeout" : "storage_download_failed",
      timedOut ? 504 : 502,
      timedOut
        ? "The PDF download timed out."
        : "The PDF could not be downloaded.",
      true,
    );
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 404) {
    throw new HomeworkWorkerError(
      "storage_object_not_found",
      404,
      "The source PDF was not found.",
      false,
    );
  }
  if (response.status === 401 || response.status === 403) {
    throw new HomeworkWorkerError(
      "storage_access_denied",
      403,
      "The source PDF cannot be accessed.",
      false,
    );
  }
  if (!response.ok) {
    throw new HomeworkWorkerError(
      "storage_download_failed",
      502,
      "The PDF could not be downloaded.",
      true,
    );
  }

  const contentType = response.headers.get("content-type")?.split(";", 1)[0]
    .trim().toLowerCase();
  if (contentType !== "application/pdf") {
    throw new HomeworkWorkerError(
      "storage_object_not_pdf",
      415,
      "The source object is not a PDF.",
      false,
    );
  }

  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > config.maxPdfBytes) {
    throw new HomeworkWorkerError(
      "storage_pdf_too_large",
      413,
      "The source PDF exceeds the size limit.",
      false,
    );
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > config.maxPdfBytes) {
    throw new HomeworkWorkerError(
      "storage_pdf_too_large",
      413,
      "The source PDF exceeds the size limit.",
      false,
    );
  }
  if (bytes.byteLength < PDF_MAGIC.length || !hasPdfMagic(bytes)) {
    throw new HomeworkWorkerError(
      "storage_pdf_corrupt",
      422,
      "The source PDF is invalid or corrupted.",
      false,
    );
  }

  return bytes;
}
