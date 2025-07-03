import { describe, expect, it } from "vitest";
import { z } from "zod";

import { TRPCError } from "@trpc/server";

import { errorFormatter } from "./errorFormatter";

describe("errorFormatter", () => {
  const baseShape = {
    message: "Internal Server Error",
    code: 500,
    data: {
      code: "INTERNAL_SERVER_ERROR",
      httpStatus: 500,
      path: "test",
    },
  };

  it("should format ZodError as BAD_REQUEST", () => {
    const zodError = new z.ZodError([
      {
        path: ["name"],
        message: "Required",
        code: "invalid_type",
        expected: "string",
        received: "undefined",
      },
    ]);

    const error = new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal Server Error",
      cause: zodError,
    });

    const result = errorFormatter({
      shape: baseShape,
      error,
      type: "query",
      path: "test",
      input: undefined,
      ctx: undefined,
    });

    expect(result).toEqual({
      message: "Invalid input",
      code: 400,
      data: {
        code: "BAD_REQUEST",
        httpStatus: 400,
        path: "test",
        zodError: {
          formErrors: [],
          fieldErrors: {
            name: ["Required"],
          },
        },
      },
    });
  });

  it("should handle nested ZodError", () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
        age: z.number().min(18),
      }),
    });

    const zodError = new z.ZodError([
      {
        path: ["user", "age"],
        message: "Number must be greater than or equal to 18",
        code: "too_small",
        minimum: 18,
        type: "number",
        inclusive: true,
      },
    ]);

    const error = new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal Server Error",
      cause: zodError,
    });

    const result = errorFormatter({
      shape: baseShape,
      error,
      type: "query",
      path: "test",
      input: undefined,
      ctx: undefined,
    });

    expect(result).toEqual({
      message: "Invalid input",
      code: 400,
      data: {
        code: "BAD_REQUEST",
        httpStatus: 400,
        path: "test",
        zodError: {
          formErrors: [],
          fieldErrors: {
            user: ["Number must be greater than or equal to 18"],
          },
        },
      },
    });
  });

  it("should handle multiple ZodError issues", () => {
    const zodError = new z.ZodError([
      {
        path: ["name"],
        message: "Required",
        code: "invalid_type",
        expected: "string",
        received: "undefined",
      },
      {
        path: ["age"],
        message: "Number must be greater than or equal to 18",
        code: "too_small",
        minimum: 18,
        type: "number",
        inclusive: true,
      },
    ]);

    const error = new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal Server Error",
      cause: zodError,
    });

    const result = errorFormatter({
      shape: baseShape,
      error,
      type: "query",
      path: "test",
      input: undefined,
      ctx: undefined,
    });

    expect(result).toEqual({
      message: "Invalid input",
      code: 400,
      data: {
        code: "BAD_REQUEST",
        httpStatus: 400,
        path: "test",
        zodError: {
          formErrors: [],
          fieldErrors: {
            name: ["Required"],
            age: ["Number must be greater than or equal to 18"],
          },
        },
      },
    });
  });

  it("should not modify TRPCError", () => {
    const error = new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid input",
    });

    const result = errorFormatter({
      shape: baseShape,
      error,
      type: "query",
      path: "test",
      input: undefined,
      ctx: undefined,
    });

    expect(result).toEqual(baseShape);
  });

  it("should not modify generic Error", () => {
    const baseError = new Error("Database connection failed");
    const error = new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal Server Error",
      cause: baseError,
    });

    const result = errorFormatter({
      shape: baseShape,
      error,
      type: "query",
      path: "test",
      input: undefined,
      ctx: undefined,
    });

    expect(result).toEqual(baseShape);
  });

  it("should handle empty ZodError", () => {
    const zodError = new z.ZodError([]);
    const error = new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal Server Error",
      cause: zodError,
    });

    const result = errorFormatter({
      shape: baseShape,
      error,
      type: "query",
      path: "test",
      input: undefined,
      ctx: undefined,
    });

    expect(result).toEqual({
      message: "Invalid input",
      code: 400,
      data: {
        code: "BAD_REQUEST",
        httpStatus: 400,
        path: "test",
        zodError: {
          formErrors: [],
          fieldErrors: {},
        },
      },
    });
  });
});
