import type { FeatureId } from "@calcom/features/flags/config";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import type { Prisma } from "@calcom/prisma/client";
import { TestingModule } from "@nestjs/testing";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

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

  async setTeamFeatureState(
    input:
      | { teamId: number; featureId: string; state: "enabled" | "disabled"; assignedBy?: string }
      | { teamId: number; featureId: string; state: "inherit" }
  ) {
    if (input.state === "inherit") {
      await this.featuresRepository.setTeamFeatureState({
        teamId: input.teamId,
        featureId: input.featureId as FeatureId,
        state: input.state,
      });
    } else {
      await this.featuresRepository.setTeamFeatureState({
        teamId: input.teamId,
        featureId: input.featureId as FeatureId,
        state: input.state,
        assignedBy: input.assignedBy ?? "test",
      });
    }
  }

  async disableFeatureForTeam(teamId: number, featureSlug: string) {
    await this.featuresRepository.setTeamFeatureState({
      teamId,
      featureId: featureSlug as FeatureId,
      state: "inherit",
    });
  }

  async deleteBySlug(slug: string) {
    return await this.prismaWriteClient.feature.delete({
      where: { slug },
    });
  }

  async deleteTeamFeature(teamId: number, featureSlug: string) {
    await this.featuresRepository.setTeamFeatureState({
      teamId,
      featureId: featureSlug as FeatureId,
      state: "inherit",
    });
  }
}
