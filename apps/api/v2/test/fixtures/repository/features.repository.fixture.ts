import type { Prisma } from "@calcom/prisma/client";
import { TestingModule } from "@nestjs/testing";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

export class FeaturesRepositoryFixture {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(module: TestingModule) {
    this.prismaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }
  async create(data: Prisma.FeatureCreateInput) {
    return await this.prismaWriteClient.feature.upsert({
      where: { slug: data.slug },
      create: data,
      update: {},
    });
  }

  async setTeamFeatureState(
    input:
      | { teamId: number; featureId: string; state: "enabled" | "disabled"; assignedBy?: string }
      | { teamId: number; featureId: string; state: "inherit" }
  ) {
    if (input.state === "inherit") {
      await this.prismaWriteClient.teamFeatures.deleteMany({
        where: {
          teamId: input.teamId,
          featureId: input.featureId,
        },
      });
    } else {
      await this.prismaWriteClient.teamFeatures.upsert({
        where: {
          teamId_featureId: {
            teamId: input.teamId,
            featureId: input.featureId,
          },
        },
        create: {
          teamId: input.teamId,
          featureId: input.featureId,
          enabled: input.state === "enabled",
          assignedBy: input.assignedBy ?? "test",
        },
        update: {
          enabled: input.state === "enabled",
          assignedBy: input.assignedBy ?? "test",
        },
      });
    }
  }

  async disableFeatureForTeam(teamId: number, featureSlug: string) {
    await this.prismaWriteClient.teamFeatures.deleteMany({
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
    await this.prismaWriteClient.teamFeatures.deleteMany({
      where: {
        teamId,
        featureId: featureSlug,
      },
    });
  }
}
