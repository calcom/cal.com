import { getTeamFeatureRepository } from "@calcom/platform-libraries/repositories";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import type { FeatureId } from "@calcom/features/flags/config";
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
    const teamFeatureRepository = getTeamFeatureRepository();
    if (input.state === "inherit") {
      await teamFeatureRepository.delete(input.teamId, input.featureId as FeatureId);
    } else {
      await teamFeatureRepository.upsert(
        input.teamId,
        input.featureId as FeatureId,
        input.state === "enabled",
        "assignedBy" in input ? (input.assignedBy ?? "test") : "test"
      );
    }
  }

  async disableFeatureForTeam(teamId: number, featureSlug: string) {
    const teamFeatureRepository = getTeamFeatureRepository();
    await teamFeatureRepository.delete(teamId, featureSlug as FeatureId);
  }

  async deleteBySlug(slug: string) {
    return await this.prismaWriteClient.feature.delete({
      where: { slug },
    });
  }

  async deleteTeamFeature(teamId: number, featureSlug: string) {
    const teamFeatureRepository = getTeamFeatureRepository();
    await teamFeatureRepository.delete(teamId, featureSlug as FeatureId);
  }
}
