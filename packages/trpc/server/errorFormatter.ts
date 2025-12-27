import { z } from "zod";

import type { TRPCError } from "@trpc/server";

type ErrorShape = {
  message: string;
  code: number;
  data: {
    code: string;
    httpStatus: number;
    path?: string;
    [key: string]: unknown;
  };
};

type ErrorFormatterOptions = {
  shape: ErrorShape;
  error: TRPCError;
  type: "query" | "mutation" | "subscription" | "unknown";
  path: string | undefined;
  input: unknown;
  ctx: unknown;
};

// Helper to get ZodError from TRPCError cause
// tRPC wraps causes in UnknownCauseError which may lose ZodError properties
// In that case, we try to parse the issues from the error message
function getZodErrorFromCause(cause: unknown): z.ZodError | null {
  if (cause instanceof z.ZodError) {
    return cause;
  }

  // Check if it's a ZodError with proper properties
  if (
    cause !== null &&
    typeof cause === "object" &&
    "name" in cause &&
    cause.name === "ZodError" &&
    "issues" in cause &&
    Array.isArray((cause as { issues: unknown }).issues) &&
    "flatten" in cause &&
    typeof (cause as { flatten: unknown }).flatten === "function"
  ) {
    return cause as z.ZodError;
  }

  // Handle tRPC's UnknownCauseError wrapping where ZodError properties are lost
  // The error message contains JSON-serialized issues, try to reconstruct
  if (
    cause !== null &&
    typeof cause === "object" &&
    "name" in cause &&
    cause.name === "ZodError" &&
    "message" in cause &&
    typeof cause.message === "string"
  ) {
    try {
      const issues = JSON.parse(cause.message);
      if (Array.isArray(issues)) {
        return new z.ZodError(issues);
      }
    } catch {
      // Message is not JSON, can't reconstruct
    }
  }

  return null;
}

export function errorFormatter({ shape, error }: ErrorFormatterOptions): ErrorShape {
  const zodError = getZodErrorFromCause(error.cause);
  if (zodError) {
    return {
      message: "Invalid input",
      code: 400,
      data: {
        code: "BAD_REQUEST",
        httpStatus: 400,
        path: shape.data.path,
        zodError: zodError.flatten(),
      },
    };
  }
  return shape;
}
