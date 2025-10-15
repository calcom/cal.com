import type { Prisma } from "@calcom/prisma/client";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

export const getValidatedTeamSubscriptionId = async (metadata: Prisma.JsonValue) => {
  const teamMetadataParsed = teamMetadataSchema.safeParse(metadata);

  if (!teamMetadataParsed.success || !teamMetadataParsed.data?.subscriptionId) {
    return null;
  }

  return teamMetadataParsed.data.subscriptionId;
};
