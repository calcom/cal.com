import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
import { prisma } from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import type { TrpcSessionUser } from "../../../trpc";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listOtherTeamHandler = async ({ ctx }: ListOptions) => {
  if (ctx.user?.organization?.id) {
    const isOrgAdmin = !!(await isOrganisationAdmin(ctx.user.id, ctx.user.organization.id)); // Org id exists here as we're inside a conditional TS complaining for some reason
    if (!isOrgAdmin) {
      return [];
    }

    // Only fetch memberships that I'm not part of but are part of my organization
    const membershipsInOrgIamNotPartOf = await prisma.membership.findMany({
      where: {
        userId: {
          not: ctx.user.id,
        },
        team: {
          parent: {
            is: {
              id: ctx.user?.organization?.id,
            },
          },
        },
      },
      include: {
        team: true,
      },
      orderBy: { role: "desc" },
    });

    return membershipsInOrgIamNotPartOf.map(({ team, ...membership }) => ({
      role: membership.role,
      accepted: membership.accepted,
      isOrgAdmin,
      ...team,
    }));
  }

  const memberships = await prisma.membership.findMany({
    where: {
      userId: ctx.user.id,
    },
    include: {
      team: true,
    },
    orderBy: { role: "desc" },
  });

  return memberships
    .filter((mmship) => {
      const metadata = teamMetadataSchema.parse(mmship.team.metadata);
      return !metadata?.isOrganization;
    })
    .map(({ team, ...membership }) => ({
      role: membership.role,
      accepted: membership.accepted,
      ...team,
    }));
};
