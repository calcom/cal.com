import type { PrismaClient } from "@calcom/prisma/client";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { CredentialRepository } from "./CredentialRepository";

vi.mock("@calcom/prisma", () => ({
  default: {},
  prisma: {},
}));

vi.mock("@calcom/app-store/delegationCredential", () => ({
  enrichHostsWithDelegationCredentials: vi.fn(),
  getUsersCredentialsIncludeServiceAccountKey: vi.fn(),
  getCredentialForSelectedCalendar: vi.fn(),
}));

describe("CredentialRepository", () => {
  let mockPrisma: { credential: { findMany: ReturnType<typeof vi.fn> } };
  let repo: CredentialRepository;

  beforeEach(() => {
    mockPrisma = { credential: { findMany: vi.fn() } };
    repo = new CredentialRepository(mockPrisma as unknown as PrismaClient);
  });

  test("scenario 5: findByIds returns empty array without calling Prisma when ids is empty", async () => {
    const result = await repo.findByIds({ ids: [] });

    expect(result).toEqual([]);
    expect(mockPrisma.credential.findMany).not.toHaveBeenCalled();
  });
});
