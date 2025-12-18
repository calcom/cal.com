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
    // note(Lauris): upserting because this create function is called in multiple tests in parallel and otherwise would lead to unique
    // key constraint violation.
    return await this.prismaWriteClient.feature.upsert({
      where: { slug: data.slug },
      create: data,
      update: {},
    });
  }

  async createTeamFeature(data: Prisma.TeamFeaturesCreateInput) {
    return await this.prismaWriteClient.teamFeatures.create({
      data,
    });
  }

  async setTeamFeatureState(
    teamId: number,
    featureId: string,
    state: "enabled" | "disabled" | "inherit",
    assignedBy = "test"
  ) {
    if (state === "enabled" || state === "disabled") {
      await this.prismaWriteClient.teamFeatures.upsert({
        where: {
          teamId_featureId: {
            teamId,
            featureId,
          },
        },
        create: {
          teamId,
          featureId,
          assignedBy,
          enabled: state === "enabled",
        },
        update: {
          enabled: state === "enabled",
        },
      });
    } else if (state === "inherit") {
      await this.prismaWriteClient.teamFeatures.deleteMany({
        where: {
          teamId,
          featureId,
        },
      });
    }
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
