import * as z from "zod"

import { AppError } from "@/lib/errors/app-error"
import { extractParams } from "@/lib/validation/extract-params"

import type { ActionResult, ApiErrorResponse } from "./action-result"

// Opakowuje logikę Server Action i mapuje wyjątki na ustrukturyzowany ActionResult:
//   ZodError → validation, AppError → auth/business, cokolwiek innego → server (z traceId).
export async function toActionResult<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn()
    return { status: "success", data }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        status: "error",
        error: {
          type: "validation",
          message: "errors.validation.failed",
          fieldErrors: err.issues.map((issue) => ({
            code: issue.code,
            message: issue.message,
            params: extractParams(issue),
            path: issue.path as (string | number)[],
          })),
        },
      }
    }

    if (err instanceof AppError) {
      const type: ApiErrorResponse["type"] =
        err.code === "UNAUTHORIZED" ||
        err.code === "FORBIDDEN" ||
        err.code === "INVALID_CREDENTIALS"
          ? "auth"
          : "business"
      return {
        status: "error",
        error: {
          type,
          message: `errors.${err.code}`,
          fieldErrors: err.field
            ? [{ code: err.code, message: err.message, params: err.params, path: [err.field] }]
            : undefined,
        },
      }
    }

    const traceId = crypto.randomUUID()
    return {
      status: "error",
      error: {
        type: "server",
        message: "errors.unexpected",
        traceId,
      },
    }
  }
}
