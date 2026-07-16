import { HomeworkWorkerError } from "./errors.ts";

interface RpcResult {
  data: unknown;
  error: { code?: string; message?: string } | null;
}

export interface AdminRpcClient {
  rpc(
    name: string,
    parameters?: Record<string, unknown>,
  ): PromiseLike<RpcResult>;
}

function databaseError(code: string): HomeworkWorkerError {
  return new HomeworkWorkerError(
    code,
    502,
    "The homework queue could not be updated.",
    true,
  );
}

export async function processNextBlock(
  client: AdminRpcClient,
): Promise<unknown> {
  const { data, error } = await client.rpc("claim_next_homework_block");

  if (error) throw databaseError("queue_claim_failed");
  return data;
}

export async function retryBlock(
  client: AdminRpcClient,
  blockId: string,
): Promise<unknown> {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(blockId)
  ) {
    throw new HomeworkWorkerError(
      "invalid_block_id",
      400,
      "The homework block ID is invalid.",
      false,
    );
  }

  const { data, error } = await client.rpc("retry_homework_block", {
    p_block_id: blockId,
  });

  if (error) throw databaseError("queue_retry_failed");
  return data;
}
