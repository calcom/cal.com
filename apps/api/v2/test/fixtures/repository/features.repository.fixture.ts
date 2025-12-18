import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TestingModule } from "@nestjs/testing";

import type { FeatureId } from "@calcom/features/flags/config";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import type { Prisma } from "@calcom/prisma/client";

export class FeaturesRepositoryFixture {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];
  private featuresRepository: FeaturesRepository;

  constructor(module: TestingModule) {
    this.prismaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
    this.featuresRepository = new FeaturesRepository(this.prismaWriteClient);
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
    await this.featuresRepository.setTeamFeatureState(teamId, featureId as FeatureId, state, assignedBy);
  }

  async disableFeatureForTeam(teamId: number, featureSlug: string) {
    await this.featuresRepository.setTeamFeatureState(teamId, featureSlug as FeatureId, "inherit", "test");
  }

  async deleteBySlug(slug: string) {
    return await this.prismaWriteClient.feature.delete({
      where: { slug },
    });
  }

  async deleteTeamFeature(teamId: number, featureSlug: string) {
    await this.featuresRepository.setTeamFeatureState(teamId, featureSlug as FeatureId, "inherit", "test");
  }
}
