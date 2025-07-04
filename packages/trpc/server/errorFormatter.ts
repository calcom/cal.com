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

export function errorFormatter({ shape, error }: ErrorFormatterOptions): ErrorShape {
  if (error.cause instanceof z.ZodError) {
    return {
      message: "Invalid input",
      code: 400,
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
