"use server";

// TODO: Figure out how to handle this - this is a complete WET copy of the trpc functions for these calls
import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { getServerSession } from "@lib/getServerSession";

export async function getCurrentOrg() {
  const { user } = await getServerSession();

  if (!user.organizationId) {
    return null;
  }

  const membership = await prisma.membership.findFirst({
    where: {
      userId: user.id,
      team: {
        id: user.organizationId,
      },
    },
    include: {
      team: true,
    },
  });

  return {
    user: {
      role: membership?.role,
      accepted: membership?.accepted,
    },
    ...membership?.team,
  };
}

export async function getTeams() {
  const { user } = await getServerSession();
  if (user?.organizationId) {
    const membershipsWithoutParent = await prisma.membership.findMany({
      where: {
        userId: user.id,
        team: {
          parent: {
            is: {
              id: user?.organizationId,
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

    const isOrgAdmin = !!(await isOrganisationAdmin(user.id, user.organizationId)); // Org id exists here as we're inside a conditional TS complaining for some reason

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
      userId: user.id,
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
}

export async function getUserForTabs() {
  const session = await getServerSession();
  return await prisma.user.findUnique({
    where: {
      id: session?.user.id,
    },
    select: {
      identityProvider: true,
    },
  });
}
