import { prisma } from "@calcom/prisma";

import { PrismaOrganizationBillingRepository } from "./PrismaOrganizationBillingRepository";
import { PrismaTeamBillingRepository } from "./PrismaTeamBillingRepository";
import { StubBillingRepository } from "./StubBillingRepository";

export class BillingRepositoryFactory {
  static getRepository(isOrganization: boolean, isBillingEnabled: boolean) {
    if (!isBillingEnabled) {
      return new StubBillingRepository();
    }

    if (isOrganization) {
      return new PrismaOrganizationBillingRepository(prisma);
    }
    return new PrismaTeamBillingRepository(prisma);
  }
}
