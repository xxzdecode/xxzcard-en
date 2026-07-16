export class HomeworkWorkerError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(
    code: string,
    httpStatus: number,
    message: string,
    retryable: boolean,
  ) {
    super(message);
    this.name = "HomeworkWorkerError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.retryable = retryable;
  }
}

export function publicErrorBody(error: HomeworkWorkerError): {
  error: { code: string; message: string; retryable: boolean };
} {
  return {
    error: {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
    },
  };
}
