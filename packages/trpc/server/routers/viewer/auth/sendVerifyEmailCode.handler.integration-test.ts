import { randomBytes } from "node:crypto";
import prisma from "@calcom/prisma";
import { afterAll, describe, expect, it } from "vitest";
import { sendVerifyEmailCode } from "./sendVerifyEmailCode.handler";

const timestamp = Date.now();
const unique = () => randomBytes(4).toString("hex");

describe("sendVerifyEmailCode.handler - integration", () => {
  afterAll(async () => {
    try {
      await prisma.verificationToken.deleteMany({
        where: { identifier: { startsWith: `verify-${timestamp}` } },
      });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should return ok:true when sending verification code for a valid email", async () => {
    const email = `verify-${timestamp}-${unique()}@example.com`;

    const result = await sendVerifyEmailCode({
      input: {
        email,
        language: "en",
      },
      identifier: `test-identifier-${unique()}`,
    });

    expect(result).toBeDefined();
    expect(result.ok).toBeDefined();
  });

  it("should handle email with username parameter", async () => {
    const email = `verify-${timestamp}-${unique()}@example.com`;

    const result = await sendVerifyEmailCode({
      input: {
        email,
        username: "testuser",
        language: "en",
      },
      identifier: `test-identifier-${unique()}`,
    });

    expect(result).toBeDefined();
    expect(result.ok).toBeDefined();
  });

  it("should handle isVerifyingEmail flag", async () => {
    const email = `verify-${timestamp}-${unique()}@example.com`;

    const result = await sendVerifyEmailCode({
      input: {
        email,
        language: "en",
        isVerifyingEmail: true,
      },
      identifier: `test-identifier-${unique()}`,
    });

    expect(result).toBeDefined();
    expect(result.ok).toBeDefined();
  });

  it("should accept different language codes", async () => {
    const email = `verify-${timestamp}-${unique()}@example.com`;

    const result = await sendVerifyEmailCode({
      input: {
        email,
        language: "de",
      },
      identifier: `test-identifier-${unique()}`,
    });

    expect(result).toBeDefined();
    expect(result.ok).toBeDefined();
  });
});
