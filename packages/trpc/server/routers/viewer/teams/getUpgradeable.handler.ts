import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

type GetUpgradeableOptions = {
  userId: number;
};

export const getUpgradeableHandler = async ({ userId }: GetUpgradeableOptions) => {
  if (!IS_TEAM_BILLING_ENABLED) return [];

  // Get all teams/orgs where the user is an owner
  // Filter out teams that already have a billing record, orgs (handled by OrgUpgradeBanner), and teams with children (also orgs)
  const teams = await prisma.membership.findMany({
    where: {
      user: {
        id: userId,
      },
      role: MembershipRole.OWNER,
      team: {
        parentId: null,
        isOrganization: false,
        teamBilling: null,
        children: {
          none: {},
        },
      },
    },
    select: {
      id: true,
      teamId: true,
      userId: true,
      role: true,
      accepted: true,
      team: {
        select: {
          id: true,
          name: true,
          slug: true,
          isOrganization: true,
          metadata: true,
        },
      },
    },
  });
  return teams;
};

export default getUpgradeableHandler;
