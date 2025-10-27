import { describe, it, expect } from "vitest";

import { PrismaOrganizationBillingRepository } from "./PrismaOrganizationBillingRepository";
import { PrismaTeamBillingRepository } from "./PrismaTeamBillingRepository";
import { BillingRepositoryFactory } from "./billingRepositoryFactory";

describe("BillingRepositoryFactory", () => {
  describe("getRepository", () => {
    it("should return PrismaOrganizationBillingRepository when isOrganization is true", () => {
      const repository = BillingRepositoryFactory.getRepository(true);

      expect(repository).toBeInstanceOf(PrismaOrganizationBillingRepository);
    });

    it("should return PrismaTeamBillingRepository when isOrganization is false", () => {
      const repository = BillingRepositoryFactory.getRepository(false);

      expect(repository).toBeInstanceOf(PrismaTeamBillingRepository);
    });

    it("should return same repository type for multiple calls with same parameter", () => {
      const repository1 = BillingRepositoryFactory.getRepository(true);
      const repository2 = BillingRepositoryFactory.getRepository(true);

      expect(repository1).toBeInstanceOf(PrismaOrganizationBillingRepository);
      expect(repository2).toBeInstanceOf(PrismaOrganizationBillingRepository);
    });

    it("should return different repository types for different parameters", () => {
      const orgRepository = BillingRepositoryFactory.getRepository(true);
      const teamRepository = BillingRepositoryFactory.getRepository(false);

      expect(orgRepository).toBeInstanceOf(PrismaOrganizationBillingRepository);
      expect(teamRepository).toBeInstanceOf(PrismaTeamBillingRepository);
      expect(orgRepository).not.toBeInstanceOf(PrismaTeamBillingRepository);
      expect(teamRepository).not.toBeInstanceOf(PrismaOrganizationBillingRepository);
    });
  });
});
