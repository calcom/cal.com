import { describe, it, expect } from "vitest";

import { signupSchema } from "@calcom/prisma/zod-utils";

const validPassword = "AvalidPassword123!";

describe("signupSchema email field validation", () => {
  it("should pass for a valid email", () => {
    const result = signupSchema.safeParse({
      email: "testuser@example.com",
      password: validPassword,
    });
    expect(result.success).toBe(true);
  });

  it('should fail for email with invalid tld (e.g. "testuser@example.c")', () => {
    const result = signupSchema.safeParse({
      email: "testuser@example.c",
      password: validPassword,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailError = result.error.errors.find((e) => e.path.includes("email"));
      expect(emailError).toBeDefined();
      expect(emailError?.message).toBe("Invalid email");
    }
  });

  it('should fail for email with domain ending with a dot (e.g. "testuser@example.")', () => {
    const result = signupSchema.safeParse({
      email: "testuser@example.",
      password: validPassword,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailError = result.error.errors.find((e) => e.path.includes("email"));
      expect(emailError).toBeDefined();
      expect(emailError?.message).toBe("Invalid email");
    }
  });

  it('should fail for email with domain missing a dot (e.g. "testuser@examplecom")', () => {
    const result = signupSchema.safeParse({
      email: "testuser@examplecom",
      password: validPassword,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailError = result.error.errors.find((e) => e.path.includes("email"));
      expect(emailError).toBeDefined();
      expect(emailError?.message).toBe("Invalid email");
    }
  });

  it('should fail for email with an empty domain (e.g. "testuser@")', () => {
    const result = signupSchema.safeParse({
      email: "testuser@",
      password: validPassword,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailError = result.error.errors.find((e) => e.path.includes("email"));
      expect(emailError).toBeDefined();
      expect(emailError?.message).toBe("Invalid email");
    }
  });

  it('should pass for an email without "@" (e.g. "abc") because the refinement does not trigger', () => {
    const result = signupSchema.safeParse({
      email: "abc",
      password: validPassword,
    });
    // bAsed on the current logic, emails without "@" bypass the refinement.
    expect(result.success).toBe(true);
  });

  it('should pass for an email with single character (e.g. "a") because the refinement does not trigger', () => {
    const result = signupSchema.safeParse({
      email: "a",
      password: validPassword,
    });
    expect(result.success).toBe(true);
  });

  it('should fail for email starting with a dot in local part (e.g. ".testuser@example.com")', () => {
    const result = signupSchema.safeParse({
      email: ".testuser@example.com",
      password: validPassword,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailError = result.error.errors.find((e) => e.path.includes("email"));
      expect(emailError).toBeDefined();
      expect(emailError?.message).toBe("Invalid email");
    }
  });

  it('should fail for email with consecutive dots in local part (e.g. "testuser..test@example.com")', () => {
    const result = signupSchema.safeParse({
      email: "testuser..test@example.com",
      password: validPassword,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailError = result.error.errors.find((e) => e.path.includes("email"));
      expect(emailError).toBeDefined();
      expect(emailError?.message).toBe("Invalid email");
    }
  });

  it('should fail for email ending with a dot in local part (e.g. "testuser.@example.com")', () => {
    const result = signupSchema.safeParse({
      email: "testuser.@example.com",
      password: validPassword,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailError = result.error.errors.find((e) => e.path.includes("email"));
      expect(emailError).toBeDefined();
      expect(emailError?.message).toBe("Invalid email");
    }
  });

  it('should fail for email with multiple "@" symbols (e.g. "testuser@@example.com")', () => {
    const result = signupSchema.safeParse({
      email: "testuser@@example.com",
      password: validPassword,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailError = result.error.errors.find((e) => e.path.includes("email"));
      expect(emailError).toBeDefined();
      expect(emailError?.message).toBe("Invalid email");
    }
  });

  it('should fail for email with domain starting with a dot (e.g. "testuser@.example.com")', () => {
    const result = signupSchema.safeParse({
      email: "testuser@.example.com",
      password: validPassword,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailError = result.error.errors.find((e) => e.path.includes("email"));
      expect(emailError).toBeDefined();
      expect(emailError?.message).toBe("Invalid email");
    }
  });

  it('should fail for email with consecutive dots in domain (e.g. "testuser@example..com")', () => {
    const result = signupSchema.safeParse({
      email: "testuser@example..com",
      password: validPassword,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailError = result.error.errors.find((e) => e.path.includes("email"));
      expect(emailError).toBeDefined();
      expect(emailError?.message).toBe("Invalid email");
    }
  });

  it('should fail for email with invalid character in domain (e.g. "testuser@exam_ple.com")', () => {
    const result = signupSchema.safeParse({
      email: "testuser@exam_ple.com",
      password: validPassword,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailError = result.error.errors.find((e) => e.path.includes("email"));
      expect(emailError).toBeDefined();
      expect(emailError?.message).toBe("Invalid email");
    }
  });

  it('should fail for email with space in domain (e.g. "testuser@ex ample.com")', () => {
    const result = signupSchema.safeParse({
      email: "testuser@ex ample.com",
      password: validPassword,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailError = result.error.errors.find((e) => e.path.includes("email"));
      expect(emailError).toBeDefined();
      expect(emailError?.message).toBe("Invalid email");
    }
  });
});
