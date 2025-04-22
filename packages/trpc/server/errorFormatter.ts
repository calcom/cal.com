import { z } from "zod";

import type { TRPCError } from "@trpc/server";

type ErrorFormatterOptions = {
  shape: {
    message: string;
    code: string;
    data: {
      code: string;
      httpStatus: number;
      path?: string;
      [key: string]: unknown;
    };
  };
  error: TRPCError;
  type: "query" | "mutation" | "subscription" | "unknown";
  path: string | undefined;
  input: unknown;
  ctx: unknown;
};

export function errorFormatter({ shape, error }: ErrorFormatterOptions) {
  if (error.cause instanceof z.ZodError) {
    return {
      message: "Invalid input",
      code: "BAD_REQUEST",
      data: {
        code: "BAD_REQUEST",
        httpStatus: 400,
        path: shape.data.path,
        zodError: error.cause.flatten(),
      },
    };
  }
  return shape;
}
