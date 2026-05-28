export type FieldError = {
  code: string
  message: string
  params?: Record<string, unknown>
  path: (string | number)[]
}

export type ApiErrorResponse = {
  type: "validation" | "business" | "auth" | "server"
  message: string
  fieldErrors?: FieldError[]
  traceId?: string
}

export type ActionResult<T> =
  | { status: "success"; data: T }
  | { status: "error"; error: ApiErrorResponse }
