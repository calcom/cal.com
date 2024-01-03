import type { Team } from "@calcom/prisma/client";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

export const getParsedTeam = <T extends { metadata: Team["metadata"] }>(team: T) => {
  const metadata = teamMetadataSchema.parse(team.metadata);
  const requestedSlug = metadata?.requestedSlug ?? null;
  return {
    ...team,
    requestedSlug,
    metadata: {
      ...metadata,
      requestedSlug,
    },
  };
};
