import type { PrismaClient } from "@calcom/prisma";
import { type DeepMockProxy, mockDeep, mockReset } from "vitest-mock-extended";

// Prisma mock instance (singleton)
export const prismaMock: DeepMockProxy<PrismaClient> = mockDeep<PrismaClient>();

export function resetPrismaMock(): void {
  mockReset(prismaMock);
}

// Custom P2002 error class for testing unique constraint violations
export class MockPrismaClientKnownRequestError extends Error {
  code: string;
  meta?: { target?: string[] };

  constructor(message: string, { code, meta }: { code: string; meta?: { target?: string[] } }) {
    super(message);
    this.name = "PrismaClientKnownRequestError";
    this.code = code;
    this.meta = meta;
  }
}

export function createPrismaMock(): {
  default: DeepMockProxy<PrismaClient>;
  prisma: DeepMockProxy<PrismaClient>;
  Prisma: { PrismaClientKnownRequestError: typeof MockPrismaClientKnownRequestError };
} {
  return {
    default: prismaMock,
    prisma: prismaMock,
    Prisma: { PrismaClientKnownRequestError: MockPrismaClientKnownRequestError },
  };
}

// P2002 error factories
export function createP2002Error(target: string[]): MockPrismaClientKnownRequestError {
  return new MockPrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    meta: { target },
  });
}

export function createP2002ErrorWithoutTarget(): MockPrismaClientKnownRequestError {
  return new MockPrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    meta: {},
  });
}

export function createGenericPrismaError(): MockPrismaClientKnownRequestError {
  return new MockPrismaClientKnownRequestError("Record not found", {
    code: "P2025",
    meta: {},
  });
}
