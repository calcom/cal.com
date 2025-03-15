import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TListFilterSegmentsInputSchema } from "./list.schema";

export const listHandler = async ({
  ctx,
  input,
}: {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListFilterSegmentsInputSchema;
}) => {
  const { tableIdentifier } = input;
  const userId = ctx.user.id;

  // Get all teams that the user is a member of
  const userTeamIds = await prisma.membership
    .findMany({
      where: {
        userId,
        accepted: true,
      },
      select: {
        teamId: true,
      },
    })
    .then((memberships) => memberships.map((m) => m.teamId));

  // Fetch both user-scoped and team-scoped segments
  const segments = await prisma.filterSegment.findMany({
    where: {
      tableIdentifier,
      OR: [
        // User-scoped segments created by the current user
        {
          scope: "USER",
          userId,
        },
        // Team-scoped segments for teams the user belongs to
        {
          scope: "TEAM",
          teamId: {
            in: userTeamIds,
          },
        },
      ],
    },
    orderBy: [
      { scope: "desc" }, // USER segments first, then TEAM segments
      { createdAt: "desc" }, // Newest first within each scope
    ],
  });

  return segments;
};
