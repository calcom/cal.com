import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import type { PrismaClient } from "@calcom/prisma";

import type { TListTeamFeaturesSchema } from "./listTeamFeatures.schema";

type ListTeamFeaturesOptions = {
  ctx: {
    user: { id: number };
    prisma: PrismaClient;
  };
  input: TListTeamFeaturesSchema;
};

export const listTeamFeaturesHandler = async (opts: ListTeamFeaturesOptions) => {
  const { ctx, input } = opts;
  const { prisma } = ctx;
  const { orgId } = input;

  const featuresRepository = new FeaturesRepository(prisma);
  const organizationTeamFeatures = await featuresRepository.getOrganizationTeamFeatures(orgId);

  return organizationTeamFeatures;
};

export default listTeamFeaturesHandler;
