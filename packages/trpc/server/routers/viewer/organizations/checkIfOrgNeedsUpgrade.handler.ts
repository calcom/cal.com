import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import type { TrpcSessionUser } from "../../../types";

type GetUpgradeableOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export async function checkIfOrgNeedsUpgradeHandler({ ctx }: GetUpgradeableOptions) {
  if (!IS_TEAM_BILLING_ENABLED) return [];

  // Get all teams/orgs where the user is an owner
  let teams = await prisma.membership.findMany({
    where: {
      user: {
        id: ctx.user.id,
      },
      role: MembershipRole.OWNER,
      team: {
        isPlatform: false,
        parentId: null, // Since ORGS relay on their parent's subscription, we don't need to return them
      },
    },
    include: {
      team: true,
    },
  });

  /** We only need to return teams that don't have a `subscriptionId` on their metadata */
  teams = teams.filter((m) => {
    const metadata = teamMetadataSchema.safeParse(m.team.metadata);
    if (!m.team.isOrganization) return false;
    if (metadata.success && metadata.data?.subscriptionId) return false;
    return true;
  });

  return teams;
}

export default checkIfOrgNeedsUpgradeHandler;
