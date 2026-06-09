import { describe, expect, it } from "vitest";

import { ZDeleteMeInputSchema } from "./deleteMe.schema";

/**
 * Validação de entrada do deleteMe (issue #27633).
 * A senha precisa estar presente e não-vazia na etapa de validação de entrada,
 * antes de qualquer verificação contra o hash armazenado.
 */
describe("ZDeleteMeInputSchema", () => {
  it("rejects an empty password", () => {
    const result = ZDeleteMeInputSchema.safeParse({ password: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toContain("Password is required");
    }
  });

  it("rejects when password is missing", () => {
    const result = ZDeleteMeInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts a non-empty password", () => {
    const result = ZDeleteMeInputSchema.safeParse({ password: "my-current-password" });
    expect(result.success).toBe(true);
  });

  it("accepts a non-empty password with an optional totpCode", () => {
    const result = ZDeleteMeInputSchema.safeParse({ password: "my-current-password", totpCode: "123456" });
    expect(result.success).toBe(true);
  });
});
