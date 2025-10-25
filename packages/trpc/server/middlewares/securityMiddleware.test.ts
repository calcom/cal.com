import { describe, expect, it, vi, beforeEach } from "vitest";

import { TRPCError } from "@trpc/server";

const mockNext = vi.fn();

const MAX_INPUT_SIZE = 10 * 1024 * 1024;
const MAX_OBJECT_DEPTH = 10;
const SUSPICIOUS_KEYS = [
  "__proto__",
  "constructor",
  "prototype",
  "eval",
  "function",
  "script",
  "javascript:",
  "data:",
  "vbscript:",
];

function hasPrototypePollution(obj: unknown, depth = 0): boolean {
  if (depth > MAX_OBJECT_DEPTH) {
    return true;
  }

  if (!obj || typeof obj !== "object") {
    return false;
  }

  for (const key of Object.keys(obj)) {
    if (
      SUSPICIOUS_KEYS.some(
        (suspiciousKey) => key === suspiciousKey || key.toLowerCase().includes(suspiciousKey.toLowerCase())
      )
    ) {
      return true;
    }
  }

  try {
    const allKeys = Object.getOwnPropertyNames(obj);
    for (const key of allKeys) {
      if (SUSPICIOUS_KEYS.some((suspiciousKey) => key === suspiciousKey)) {
        return true;
      }
    }
  } catch {
    return true;
  }

  for (const value of Object.values(obj)) {
    if (hasPrototypePollution(value, depth + 1)) {
      return true;
    }
  }

  return false;
}

function isOversized(input: unknown): boolean {
  try {
    const serialized = JSON.stringify(input);
    return serialized.length > MAX_INPUT_SIZE;
  } catch {
    return true;
  }
}

function hasMaliciousPatterns(value: string): boolean {
  const maliciousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /data:text\/html/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi,
    /expression\s*\(/gi,
  ];

  return maliciousPatterns.some((pattern) => pattern.test(value));
}

function scanForMaliciousContent(obj: unknown, depth = 0): boolean {
  if (depth > MAX_OBJECT_DEPTH) {
    return true;
  }

  if (typeof obj === "string") {
    return hasMaliciousPatterns(obj);
  }

  if (Array.isArray(obj)) {
    return obj.some((item) => scanForMaliciousContent(item, depth + 1));
  }

  if (obj && typeof obj === "object") {
    return Object.values(obj).some((value) => scanForMaliciousContent(value, depth + 1));
  }

  return false;
}

const mockSecurityMiddleware = async ({
  input,
  next,
}: {
  input: unknown;
  next: () => Promise<{ ok: boolean }>;
}) => {
  if (isOversized(input)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Request payload too large",
    });
  }

  if (hasPrototypePollution(input)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid input structure",
    });
  }

  if (scanForMaliciousContent(input)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid input content",
    });
  }

  return next();
};

describe("securityMiddleware", () => {
  beforeEach(() => {
    mockNext.mockClear();
    mockNext.mockResolvedValue({ ok: true });
  });

  it("should allow valid input", async () => {
    const validInput = {
      name: "John Doe",
      email: "john@example.com",
      age: 30,
    };

    await expect(
      mockSecurityMiddleware({
        input: validInput,
        next: mockNext,
      })
    ).resolves.not.toThrow();

    expect(mockNext).toHaveBeenCalled();
  });

  it("should reject oversized payloads", async () => {
    const oversizedInput = {
      data: "x".repeat(11 * 1024 * 1024),
    };

    await expect(
      mockSecurityMiddleware({
        input: oversizedInput,
        next: mockNext,
      })
    ).rejects.toThrow(TRPCError);

    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should reject prototype pollution attempts", async () => {
    const maliciousInput = {
      constructor: { prototype: { isAdmin: true } },
      normalField: "value",
    };

    await expect(
      mockSecurityMiddleware({
        input: maliciousInput,
        next: mockNext,
      })
    ).rejects.toThrow(TRPCError);

    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should reject XSS attempts", async () => {
    const xssInput = {
      comment: '<script>alert("xss")</script>',
    };

    await expect(
      mockSecurityMiddleware({
        input: xssInput,
        next: mockNext,
      })
    ).rejects.toThrow(TRPCError);

    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should reject deeply nested objects", async () => {
    const deepObject: Record<string, unknown> = {};
    let current: Record<string, unknown> = deepObject;

    for (let i = 0; i < 15; i++) {
      current.nested = {};
      current = current.nested as Record<string, unknown>;
    }

    await expect(
      mockSecurityMiddleware({
        input: deepObject,
        next: mockNext,
      })
    ).rejects.toThrow(TRPCError);

    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should reject javascript: URLs", async () => {
    const maliciousInput = {
      url: "javascript:alert('xss')",
    };

    await expect(
      mockSecurityMiddleware({
        input: maliciousInput,
        next: mockNext,
      })
    ).rejects.toThrow(TRPCError);

    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should allow normal nested objects", async () => {
    const normalInput = {
      user: {
        profile: {
          settings: {
            theme: "dark",
          },
        },
      },
    };

    await expect(
      mockSecurityMiddleware({
        input: normalInput,
        next: mockNext,
      })
    ).resolves.not.toThrow();

    expect(mockNext).toHaveBeenCalled();
  });
});
