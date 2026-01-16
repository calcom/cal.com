import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import type { PrismaClient } from "@calcom/prisma";
import { prisma as defaultPrisma } from "@calcom/prisma";

export class MonthlyProrationFeatureRepository {
  private featuresRepository: FeaturesRepository;

  constructor(prisma?: PrismaClient) {
    this.featuresRepository = new FeaturesRepository(prisma || defaultPrisma);
  }

  async isMonthlyProrationEnabled(): Promise<boolean> {
    return this.featuresRepository.checkIfFeatureIsEnabledGlobally("monthly-proration");
  }
}
