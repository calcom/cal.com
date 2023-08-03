import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
import { prisma } from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import type { TrpcSessionUser } from "../../../trpc";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listHandler = async ({ ctx }: ListOptions) => {
  if (ctx.user?.organization?.id) {
    const membershipsWithoutParent = await prisma.membership.findMany({
      where: {
        userId: ctx.user.id,
        team: {
          parent: {
            is: {
              id: ctx.user?.organization?.id,
            },
          },
        },
      },
      include: {
        team: {
          include: {
            inviteTokens: true,
          },
        },
      },
      orderBy: { role: "desc" },
    });

    const isOrgAdmin = !!(await isOrganisationAdmin(ctx.user.id, ctx.user.organization.id)); // Org id exists here as we're inside a conditional TS complaining for some reason

    return membershipsWithoutParent.map(({ team: { inviteTokens, ..._team }, ...membership }) => ({
      role: membership.role,
      accepted: membership.accepted,
      isOrgAdmin,
      ..._team,
      /** To prevent breaking we only return non-email attached token here, if we have one */
      inviteToken: inviteTokens.find((token) => token.identifier === "invite-link-for-teamId-" + _team.id),
    }));
  }

  const memberships = await prisma.membership.findMany({
    where: {
      userId: ctx.user.id,
    },
    include: {
      team: {
        include: {
          inviteTokens: true,
        },
      },
    },
    orderBy: { role: "desc" },
  });

  return memberships
    .filter((mmship) => {
      const metadata = teamMetadataSchema.parse(mmship.team.metadata);
      return !metadata?.isOrganization;
    })
    .map(({ team: { inviteTokens, ..._team }, ...membership }) => ({
      role: membership.role,
      accepted: membership.accepted,
      ..._team,
      /** To prevent breaking we only return non-email attached token here, if we have one */
      inviteToken: inviteTokens.find((token) => token.identifier === "invite-link-for-teamId-" + _team.id),
    }));
};
