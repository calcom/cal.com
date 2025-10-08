import { prisma } from "@calcom/prisma";

import { PrismaOrganizationBillingRepository } from "./PrismaOrganizationBillingRepository";
import { PrismaTeamBillingRepository } from "./PrismaTeamBillingRepository";

export class BillingRepositoryFactory {
  static getRepository(isOrganization: boolean) {
    if (isOrganization) {
      return new PrismaOrganizationBillingRepository(prisma);
    }
    return new PrismaTeamBillingRepository(prisma);
  }
}
