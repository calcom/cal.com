import { describe, it, expect, vi } from "vitest";

import { PrismaTeamBillingDataRepository } from "./prismaTeamBilling.repository";
import { StubTeamBillingDataRepository } from "./stubTeamBilling.repository";
import { TeamBillingDataRepositoryFactory } from "./teamBillingDataRepositoryFactory";

vi.mock("@calcom/prisma", () => ({
  prisma: {},
}));

describe("TeamBillingDataRepositoryFactory", () => {
  describe("getRepository", () => {
    it("should return PrismaTeamBillingDataRepository when isBillingEnabled is true", () => {
      const repository = TeamBillingDataRepositoryFactory.getRepository(true);

      expect(repository).toBeInstanceOf(PrismaTeamBillingDataRepository);
    });

    it("should return StubTeamBillingDataRepository when isBillingEnabled is false", () => {
      const repository = TeamBillingDataRepositoryFactory.getRepository(false);

      expect(repository).toBeInstanceOf(StubTeamBillingDataRepository);
    });

    it("should return same repository type for multiple calls with same parameter", () => {
      const repository1 = TeamBillingDataRepositoryFactory.getRepository(true);
      const repository2 = TeamBillingDataRepositoryFactory.getRepository(true);

      expect(repository1).toBeInstanceOf(PrismaTeamBillingDataRepository);
      expect(repository2).toBeInstanceOf(PrismaTeamBillingDataRepository);
    });

    it("should return different repository types for different parameters", () => {
      const prismaRepository = TeamBillingDataRepositoryFactory.getRepository(true);
      const stubRepository = TeamBillingDataRepositoryFactory.getRepository(false);

      expect(prismaRepository).toBeInstanceOf(PrismaTeamBillingDataRepository);
      expect(stubRepository).toBeInstanceOf(StubTeamBillingDataRepository);
      expect(prismaRepository).not.toBeInstanceOf(StubTeamBillingDataRepository);
      expect(stubRepository).not.toBeInstanceOf(PrismaTeamBillingDataRepository);
    });
  });
});
