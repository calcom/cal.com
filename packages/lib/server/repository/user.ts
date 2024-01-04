import prisma from "@calcom/prisma";

import type { Team, User } from ".prisma/client";

export const getTeamsFromUserId = async ({ userId }: { userId: User["id"] }) => {
  const teamMemberships = await prisma.membership.findMany({
    where: {
      userId: userId,
    },
    include: {
      team: true,
    },
  });

  const acceptedTeamMemberships = teamMemberships.filter((membership) => membership.accepted);
  const pendingTeamMemberships = teamMemberships.filter((membership) => !membership.accepted);

  return {
    teams: acceptedTeamMemberships.map((membership) => membership.team),
    memberships: teamMemberships,
    acceptedTeamMemberships,
    pendingTeamMemberships,
  };
};

export const getOrganizations = async ({ userId }: { userId: User["id"] }) => {
  const { acceptedTeamMemberships } = await getTeamsFromUserId({
    userId,
  });

  const acceptedOrgMemberships = acceptedTeamMemberships.filter((membership) =>
    isOrganization({ team: membership.team })
  );

  const organizations = acceptedOrgMemberships.map((membership) => membership.team);

  return {
    organizations,
  };
};

export const isOrganization = ({ team }: { team: Pick<Team, "metadata"> }) => {
  return team.metadata?.isOrganization;
};

export const getOrganizationProfile = async ({
  profileId,
  userId,
}: {
  profileId: number | null;
  userId: number;
}) => {
  if (!profileId) {
    return null;
  }
  const profile = await prisma.profile.findUnique({
    where: {
      id: profileId,
    },
  });
  if (profile?.userId !== userId) {
    throw new Error("Unauthorized");
  }
  return profile;
};

export const getOrganizationForUser = async ({
  userId,
  organizationId,
}: {
  userId: number;
  organizationId: number;
}) => {
  const membership = await prisma.membership.findFirst({
    where: {
      userId: userId,
      teamId: organizationId,
    },
    include: {
      team: true,
    },
  });

  return membership?.team ?? null;
};
