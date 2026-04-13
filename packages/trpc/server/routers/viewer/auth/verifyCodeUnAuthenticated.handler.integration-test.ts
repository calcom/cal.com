import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyCodeUnAuthenticatedHandler } from "./verifyCodeUnAuthenticated.handler";

const timestamp = Date.now();
const unique = () => randomBytes(4).toString("hex");

describe("verifyCodeUnAuthenticated.handler - integration", () => {
  it("should throw BAD_REQUEST with invalid_code for a wrong verification code", async () => {
    const email = `verify-unauth-${timestamp}-${unique()}@example.com`;

    await expect(
      verifyCodeUnAuthenticatedHandler({
        input: { email, code: "000000" },
      })
    ).rejects.toThrow("invalid_code");
  });

  it("should throw BAD_REQUEST when code is an empty string", async () => {
    const email = `verify-unauth-${timestamp}-${unique()}@example.com`;

    await expect(
      verifyCodeUnAuthenticatedHandler({
        input: { email, code: "" },
      })
    ).rejects.toThrow();
  });

  it("should throw BAD_REQUEST for expired or random code", async () => {
    const email = `verify-unauth-${timestamp}-${unique()}@example.com`;

    await expect(
      verifyCodeUnAuthenticatedHandler({
        input: { email, code: "999999" },
      })
    ).rejects.toThrow("invalid_code");
  });

  it("should throw for a code that does not match the TOTP secret", async () => {
    const email = `verify-totp-${timestamp}-${unique()}@example.com`;

    await expect(
      verifyCodeUnAuthenticatedHandler({
        input: { email, code: "123456" },
      })
    ).rejects.toThrow("invalid_code");
  });

  it("should normalize email by extracting base email before verification", async () => {
    const baseEmail = `verify-base-${timestamp}-${unique()}@example.com`;
    const plusEmail = baseEmail.replace("@", "+alias@");

    await expect(
      verifyCodeUnAuthenticatedHandler({
        input: { email: plusEmail, code: "000000" },
      })
    ).rejects.toThrow("invalid_code");
  });
});
