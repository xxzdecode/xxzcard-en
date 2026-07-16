import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { createClient } from "@supabase/supabase-js";

import { requireTeacher, teacherUserId } from "./lib/auth.ts";
import { loadWorkerConfig } from "./lib/config.ts";
import {
  confirmHomeworkReady,
  loadHomeworkBlock,
  loadHomeworkOverview,
  resolveHomeworkReview,
} from "./lib/dashboard.ts";
import { HomeworkWorkerError, publicErrorBody } from "./lib/errors.ts";
import { loadAuthorizedPagePreview } from "./lib/preview.ts";
import { processNextBlock, retryBlock } from "./lib/queue.ts";

const config = loadWorkerConfig((name) => Deno.env.get(name));

const supabaseAdmin = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  const allowedOrigin = config.allowedOrigins.includes(origin)
    ? origin
    : config.allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
}

function jsonResponse(request: Request, body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: corsHeaders(request),
  });
}

function pdfResponse(request: Request, bytes: Uint8Array): Response {
  return new Response(bytes as BodyInit, {
    status: 200,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=homework-source-page.pdf",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function requestJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error();
    }
    return value as Record<string, unknown>;
  } catch {
    throw new HomeworkWorkerError(
      "invalid_json_body",
      400,
      "A valid JSON object is required.",
      false,
    );
  }
}

function routePath(request: Request): string {
  const pathname = new URL(request.url).pathname;
  const functionPrefix = "/homework-worker";
  const prefixIndex = pathname.indexOf(functionPrefix);

  return prefixIndex >= 0
    ? pathname.slice(prefixIndex + functionPrefix.length) || "/"
    : pathname;
}

export default {
  fetch: withSupabase({ auth: "user" }, async (request, context) => {
    const headers = corsHeaders(request);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    try {
      requireTeacher(context.userClaims);

      const path = routePath(request);

      if (request.method === "GET" && path === "/api/homework/overview") {
        return jsonResponse(request, await loadHomeworkOverview(supabaseAdmin));
      }

      const detailMatch = path.match(
        /^\/api\/homework\/blocks\/([0-9a-f-]+)$/i,
      );
      if (request.method === "GET" && detailMatch) {
        return jsonResponse(
          request,
          await loadHomeworkBlock(supabaseAdmin, detailMatch[1]),
        );
      }

      const previewMatch = path.match(
        /^\/api\/homework\/blocks\/([0-9a-f-]+)\/source-preview$/i,
      );
      if (request.method === "GET" && previewMatch) {
        const url = new URL(request.url);
        const documentId = url.searchParams.get("document_id") ?? "";
        const pageNumber = Number(url.searchParams.get("page"));
        const bytes = await loadAuthorizedPagePreview(
          supabaseAdmin,
          config,
          previewMatch[1],
          documentId,
          pageNumber,
        );
        return pdfResponse(request, bytes);
      }

      if (
        request.method === "POST" &&
        path === "/api/homework/blocks/process-next"
      ) {
        return jsonResponse(request, await processNextBlock(supabaseAdmin));
      }

      const retryMatch = path.match(
        /^\/api\/homework\/blocks\/([0-9a-f-]+)\/retry$/i,
      );
      if (request.method === "POST" && retryMatch) {
        return jsonResponse(
          request,
          await retryBlock(supabaseAdmin, retryMatch[1]),
        );
      }

      const confirmMatch = path.match(
        /^\/api\/homework\/blocks\/([0-9a-f-]+)\/confirm-ready$/i,
      );
      if (request.method === "POST" && confirmMatch) {
        return jsonResponse(
          request,
          await confirmHomeworkReady(
            supabaseAdmin,
            confirmMatch[1],
            teacherUserId(context.userClaims),
          ),
        );
      }

      const resolveMatch = path.match(
        /^\/api\/homework\/review-items\/([0-9a-f-]+)\/resolve$/i,
      );
      if (request.method === "POST" && resolveMatch) {
        const body = await requestJson(request);
        return jsonResponse(
          request,
          await resolveHomeworkReview(
            supabaseAdmin,
            resolveMatch[1],
            body.teacher_decision,
            teacherUserId(context.userClaims),
          ),
        );
      }

      return jsonResponse(request, {
        error: {
          code: "route_not_found",
          message: "The requested homework-worker route does not exist.",
        },
      }, 404);
    } catch (error) {
      const workerError = error instanceof HomeworkWorkerError
        ? error
        : new HomeworkWorkerError(
          "internal_error",
          500,
          "The homework worker could not complete the request.",
          false,
        );

      // Log only stable error metadata. Never log request headers, signed URLs,
      // storage responses, tokens, service keys, or raw PDF content.
      console.error(JSON.stringify({
        event: "homework_worker_request_failed",
        code: workerError.code,
        retryable: workerError.retryable,
      }));

      return jsonResponse(
        request,
        publicErrorBody(workerError),
        workerError.httpStatus,
      );
    }
  }),
};
