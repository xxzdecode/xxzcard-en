import type { SupabaseClient } from "@supabase/supabase-js";
import { HomeworkWorkerError } from "./errors.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requireUuid(value: string, code = "invalid_id"): string {
  if (!UUID_PATTERN.test(value)) {
    throw new HomeworkWorkerError(
      code,
      400,
      "The requested ID is invalid.",
      false,
    );
  }
  return value;
}

function queryFailed(code: string): HomeworkWorkerError {
  return new HomeworkWorkerError(
    code,
    502,
    "Homework preparation data could not be loaded.",
    true,
  );
}

export async function loadHomeworkOverview(client: SupabaseClient) {
  const [blocksResult, tasksResult, reviewResult] = await Promise.all([
    client.from("homework_blocks").select("*").order("number_start"),
    client.from("processing_tasks").select("*").order("created_at"),
    client.from("review_items").select(
      "id,block_id,status,error:problem_summary,created_at",
    )
      .order("created_at", { ascending: false }),
  ]);

  if (blocksResult.error || tasksResult.error || reviewResult.error) {
    throw queryFailed("overview_load_failed");
  }

  const blocks = blocksResult.data ?? [];
  const tasks = tasksResult.data ?? [];
  const reviews = reviewResult.data ?? [];
  const priority = [
    "locating",
    "extracting",
    "analyzing",
    "qa",
    "review",
    "blocked",
    "pending",
    "ready",
  ];
  const current = [...blocks].sort((left, right) => {
    const statusDelta = priority.indexOf(left.status) -
      priority.indexOf(right.status);
    return statusDelta || left.number_start - right.number_start;
  })[0] ?? null;

  return {
    current_block: current,
    blocks: blocks.map((block) => ({
      ...block,
      tasks: tasks.filter((task) => task.block_id === block.id),
      pending_review_count:
        reviews.filter((item) =>
          item.block_id === block.id && item.status !== "completed"
        ).length,
      recent_error: reviews.find((item) => item.block_id === block.id)?.error ??
        null,
    })),
  };
}

export async function loadHomeworkBlock(
  client: SupabaseClient,
  blockId: string,
) {
  requireUuid(blockId, "invalid_block_id");
  const [
    blockResult,
    sourceResult,
    questionResult,
    reviewResult,
    taskResult,
    auditResult,
  ] = await Promise.all([
    client.from("homework_blocks").select("*").eq("id", blockId).maybeSingle(),
    client.from("block_sources").select(
      "*,documents(id,file_name,storage_path)",
    ).eq("block_id", blockId)
      .order("pdf_page_start"),
    client.from("questions").select("*,teaching_analysis(*)").eq(
      "block_id",
      blockId,
    )
      .order("homework_number").order("section_order").order("question_order"),
    client.from("review_items").select("*").eq("block_id", blockId).order(
      "created_at",
    ),
    client.from("processing_tasks").select("*").eq("block_id", blockId).order(
      "created_at",
    ),
    client.from("homework_audit_events").select("*").eq("block_id", blockId)
      .order("created_at", { ascending: false }).limit(100),
  ]);

  if (
    blockResult.error || sourceResult.error || questionResult.error ||
    reviewResult.error ||
    taskResult.error || auditResult.error
  ) throw queryFailed("block_detail_load_failed");
  if (!blockResult.data) {
    throw new HomeworkWorkerError(
      "block_not_found",
      404,
      "The homework block was not found.",
      false,
    );
  }

  return {
    block: blockResult.data,
    sources: sourceResult.data ?? [],
    questions: questionResult.data ?? [],
    review_items: reviewResult.data ?? [],
    tasks: taskResult.data ?? [],
    audit_events: auditResult.data ?? [],
  };
}

export async function resolveHomeworkReview(
  client: SupabaseClient,
  reviewItemId: string,
  teacherDecision: unknown,
  teacherId: string,
) {
  requireUuid(reviewItemId, "invalid_review_item_id");
  if (
    !teacherDecision || typeof teacherDecision !== "object" ||
    Array.isArray(teacherDecision)
  ) {
    throw new HomeworkWorkerError(
      "invalid_teacher_decision",
      400,
      "A teacher decision is required.",
      false,
    );
  }
  const { data, error } = await client.rpc("resolve_homework_review_item", {
    p_review_item_id: reviewItemId,
    p_teacher_decision: teacherDecision,
    p_teacher_id: teacherId,
  });
  if (error) throw queryFailed("review_resolve_failed");
  return data;
}

export async function confirmHomeworkReady(
  client: SupabaseClient,
  blockId: string,
  teacherId: string,
) {
  requireUuid(blockId, "invalid_block_id");
  const { data, error } = await client.rpc("confirm_homework_block_ready", {
    p_block_id: blockId,
    p_teacher_id: teacherId,
  });
  if (error) throw queryFailed("confirm_ready_failed");
  return data;
}
