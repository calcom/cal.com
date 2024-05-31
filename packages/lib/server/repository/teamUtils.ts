import type { Team } from "@calcom/prisma/client";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

export const getParsedTeam = <T extends { metadata: Team["metadata"] }>(team: T) => {
  const metadata = teamMetadataSchema.parse(team.metadata);
  const requestedSlug = metadata?.requestedSlug ?? null;
  const { metadata: _1, ...rest } = team;
  return {
    ...rest,
    requestedSlug,
    metadata: {
      ...metadata,
      requestedSlug,
    },
  };
};
