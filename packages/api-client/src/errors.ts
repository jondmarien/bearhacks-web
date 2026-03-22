/** FastAPI `HTTPException` / validation error `detail` shapes */
export type FastApiDetail =
  | string
  | { loc?: unknown[]; msg?: string; type?: string }[]
  | Record<string, unknown>;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly detail?: FastApiDetail,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
