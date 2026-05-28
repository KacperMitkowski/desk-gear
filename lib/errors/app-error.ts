export type AppErrorCode = "UNAUTHORIZED" | "FORBIDDEN"

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message?: string,
  ) {
    super(message ?? code)
    this.name = "AppError"
  }
}
