import { HomeworkWorkerError } from "./errors.ts";

export interface WorkerConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  storageBucket: string;
  storagePrefix: string;
  maxPdfBytes: number;
  downloadTimeoutMs: number;
  allowedOrigins: string[];
}

type EnvReader = (name: string) => string | undefined;

function required(reader: EnvReader, name: string): string {
  const value = reader(name)?.trim();

  if (!value) {
    throw new HomeworkWorkerError(
      "worker_configuration_error",
      500,
      `Missing required server configuration: ${name}.`,
      false,
    );
  }

  return value;
}

function positiveInteger(
  value: string | undefined,
  fallback: number,
  name: string,
): number {
  if (!value) return fallback;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new HomeworkWorkerError(
      "worker_configuration_error",
      500,
      `Server configuration ${name} must be a positive integer.`,
      false,
    );
  }

  return parsed;
}

export function loadWorkerConfig(reader: EnvReader): WorkerConfig {
  const storagePrefix = reader("HOMEWORK_STORAGE_PREFIX")?.trim() ||
    "homework-prep/";
  const normalizedPrefix = storagePrefix.endsWith("/")
    ? storagePrefix
    : `${storagePrefix}/`;
  const allowedOrigins = (reader("HOMEWORK_ALLOWED_ORIGINS") ||
    "https://xxzdecode.github.io,http://127.0.0.1:8137,http://localhost:8137")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    supabaseUrl: required(reader, "SUPABASE_URL").replace(/\/$/, ""),
    supabaseServiceRoleKey: required(reader, "SUPABASE_SERVICE_ROLE_KEY"),
    storageBucket: reader("HOMEWORK_STORAGE_BUCKET")?.trim() ||
      "homework-source-files",
    storagePrefix: normalizedPrefix,
    maxPdfBytes: positiveInteger(
      reader("HOMEWORK_MAX_PDF_BYTES"),
      40 * 1024 * 1024,
      "HOMEWORK_MAX_PDF_BYTES",
    ),
    downloadTimeoutMs: positiveInteger(
      reader("HOMEWORK_DOWNLOAD_TIMEOUT_MS"),
      30_000,
      "HOMEWORK_DOWNLOAD_TIMEOUT_MS",
    ),
    allowedOrigins,
  };
}
