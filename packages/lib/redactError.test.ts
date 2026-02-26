import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      debug: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

// We need to control IS_PRODUCTION for different test scenarios
const mockConstants = vi.hoisted(() => ({
  IS_PRODUCTION: false,
}));

vi.mock("./constants", () => mockConstants);

import { redactError } from "./redactError";

describe("redactError", () => {
  it("returns non-Error values unchanged", () => {
    expect(redactError("string error")).toBe("string error");
    expect(redactError(42)).toBe(42);
    expect(redactError(null)).toBeNull();
    expect(redactError(undefined)).toBeUndefined();
  });

  it("returns regular Error unchanged in non-production", () => {
    mockConstants.IS_PRODUCTION = false;
    const error = new Error("test error");
    expect(redactError(error)).toBe(error);
  });

  it("returns regular Error unchanged in production (non-Prisma)", () => {
    mockConstants.IS_PRODUCTION = true;
    const error = new Error("test error");
    error.name = "TypeError";
    const result = redactError(error);
    expect(result).toBe(error);
  });

  it("redacts Prisma errors in production", () => {
    mockConstants.IS_PRODUCTION = true;
    const prismaError = new Error("Invalid `prisma.user.findFirst()` invocation");
    prismaError.name = "PrismaClientKnownRequestError";

    const result = redactError(prismaError);

    expect(result).toBeInstanceOf(Error);
    expect(result).not.toBe(prismaError);
    expect((result as Error).message).toBe("An error occurred while querying the database.");
  });

  it("does NOT redact Prisma errors outside production", () => {
    mockConstants.IS_PRODUCTION = false;
    const prismaError = new Error("Prisma query failed");
    prismaError.name = "PrismaClientKnownRequestError";

    const result = redactError(prismaError);
    expect(result).toBe(prismaError);
  });

  it("matches Prisma name case-insensitively", () => {
    mockConstants.IS_PRODUCTION = true;
    const error = new Error("db error");
    error.name = "prismaError";

    const result = redactError(error);
    expect(result).not.toBe(error);
    expect((result as Error).message).toBe("An error occurred while querying the database.");
  });
});
