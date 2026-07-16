import { assert, assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { HomeworkWorkerError } from "./errors.ts";
import { extractSinglePagePdf } from "./preview.ts";

Deno.test("source preview returns exactly the authorized page", async () => {
  const source = await PDFDocument.create();
  source.addPage([300, 400]);
  source.addPage([500, 600]);
  const previewBytes = await extractSinglePagePdf(await source.save(), 2);
  const preview = await PDFDocument.load(previewBytes);
  assertEquals(preview.getPageCount(), 1);
  assertEquals(preview.getPage(0).getWidth(), 500);
  assertEquals(preview.getPage(0).getHeight(), 600);
});

Deno.test("source preview rejects page-range and corrupt-PDF requests", async () => {
  const source = await PDFDocument.create();
  source.addPage();
  await assertRejects(
    () => extractSinglePagePdf(new Uint8Array([1, 2, 3]), 1),
    HomeworkWorkerError,
    "invalid or corrupted",
  );
  const sourceBytes = new Uint8Array(await source.save());
  const outOfRange = await assertRejects(
    () => extractSinglePagePdf(sourceBytes, 2),
    HomeworkWorkerError,
  );
  assert(outOfRange.code === "page_out_of_range");
});
