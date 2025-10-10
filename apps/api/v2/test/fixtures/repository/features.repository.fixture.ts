import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TestingModule } from "@nestjs/testing";

import type { Prisma } from "@calcom/prisma/client";

export class FeaturesRepositoryFixture {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(module: TestingModule) {
    this.prismaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }
  async create(data: Prisma.FeatureCreateInput) {
    return await this.prismaWriteClient.feature.create({
      data,
    });
  }

  async createTeamFeature(data: Prisma.TeamFeaturesCreateInput) {
    return await this.prismaWriteClient.teamFeatures.create({
      data,
    });
  }

  async enableFeatureForTeam(teamId: number, featureSlug: string, assignedBy = "test") {
    // First ensure the feature exists
    await this.prismaWriteClient.feature.upsert({
      where: { slug: featureSlug },
      update: {},
      create: {
        slug: featureSlug,
        enabled: true,
        description: `Test feature: ${featureSlug}`,
        type: "RELEASE",
      },
    });

    // Then assign it to the team
    return await this.prismaWriteClient.teamFeatures.upsert({
      where: {
        teamId_featureId: {
          teamId,
          featureId: featureSlug,
        },
      },
      update: {},
      create: {
        teamId,
        featureId: featureSlug,
        assignedBy,
      },
    });
  }

  async disableFeatureForTeam(teamId: number, featureSlug: string) {
    return await this.prismaWriteClient.teamFeatures.deleteMany({
      where: {
        teamId,
        featureId: featureSlug,
      },
    });
  }

  async deleteBySlug(slug: string) {
    return await this.prismaWriteClient.feature.delete({
      where: { slug },
    });
  }

  async deleteTeamFeature(teamId: number, featureSlug: string) {
    return await this.prismaWriteClient.teamFeatures.deleteMany({
      where: {
        teamId,
        featureId: featureSlug,
      },
    });
  }
}
