import { ExperimentsRepository } from "@calcom/features/experiments";
import type { PrismaClient } from "@calcom/prisma";

import type { TMigrateToWinnerSchema } from "./migrateToWinner.schema";

interface MigrateToWinnerOptions {
  ctx: {
    prisma: PrismaClient;
  };
  input: TMigrateToWinnerSchema;
}

export const migrateToWinnerHandler = async ({ ctx, input }: MigrateToWinnerOptions) => {
  const { experimentSlug, winnerVariant } = input;

  const repository = new ExperimentsRepository(ctx.prisma);
  const migratedCount = await repository.migrateToWinnerVariant(experimentSlug, winnerVariant);

  return {
    success: true,
    migratedCount,
    message: `Successfully migrated ${migratedCount} users to ${winnerVariant} variant`,
  };
};
