export type AppErrorCode =
  | "EMAIL_ALREADY_EXISTS"
  | "INVALID_CREDENTIALS"
  | "INSUFFICIENT_STOCK"
  | "CART_EMPTY"
  | "ORDER_CANNOT_BE_CANCELLED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INTERNAL_ERROR"

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    public readonly params: Record<string, unknown> = {},
    public readonly field?: string,
  ) {
    super(code)
    this.name = "AppError"
  }
}

// Fabryki dla typowych błędów biznesowych — nazwane wywołania zamiast ręcznego new AppError(...).
// Kolejne dochodzą razem z feature'ami (YAGNI).
export const AppErrors = {
  emailExists: (email: string) => new AppError("EMAIL_ALREADY_EXISTS", { email }, "email"),
  insufficientStock: (available: number, requested: number) =>
    new AppError("INSUFFICIENT_STOCK", { available, requested }),
}
