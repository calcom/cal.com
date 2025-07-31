import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { prisma } from "@calcom/prisma";

export const getFeaturesRepository = () => new FeaturesRepository(prisma);
