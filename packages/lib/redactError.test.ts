import { describe, expect, it, vi } from "vitest";

describe("redactError", () => {
  it("returns non-Error values as-is", async () => {
    const { redactError } = await import("./redactError");
    expect(redactError("string-error")).toBe("string-error");
    expect(redactError(null)).toBeNull();
    expect(redactError(undefined)).toBeUndefined();
  });

  it("returns generic non-Prisma errors without modification", async () => {
    const { redactError } = await import("./redactError");
    const error = new Error("Standard application error");
    expect(redactError(error)).toBe(error);
  });

  it("preserves Prisma error code when redacting message in production mode (#30375)", async () => {
    vi.resetModules();
    vi.doMock("./constants", () => ({
      IS_PRODUCTION: true,
    }));

    const { redactError } = await import("./redactError");

    const prismaError = new Error("Unique constraint failed on the fields: (`Booking_idempotencyKey_key`)");
    prismaError.name = "PrismaClientKnownRequestError";
    (prismaError as any).code = "P2002";

    const redacted = redactError(prismaError) as Error & { code?: string };

    expect(redacted.message).toBe("An error occurred while querying the database.");
    expect(redacted.code).toBe("P2002");
  });
});
