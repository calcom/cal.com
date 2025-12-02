import { TRPCError } from "@trpc/server";

import { middleware } from "../trpc";

const MAX_INPUT_SIZE = 10 * 1024 * 1024; // 10MB
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

const securityMiddleware = middleware(async ({ input, next }) => {
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
});

export default securityMiddleware;
