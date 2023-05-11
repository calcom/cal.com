import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

type GetUpgradeableOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const getUpgradeableHandler = async ({ ctx }: GetUpgradeableOptions) => {
  if (!IS_TEAM_BILLING_ENABLED) return [];
  let { teams } = await prisma.user.findUniqueOrThrow({
    where: { id: ctx.user.id },
    include: { teams: { where: { role: MembershipRole.OWNER }, include: { team: true } } },
  });
  /** We only need to return teams that don't have a `subscriptionId` on their metadata */
  teams = teams.filter((m) => {
    const metadata = teamMetadataSchema.safeParse(m.team.metadata);
    if (metadata.success && metadata.data?.subscriptionId) return false;
    return true;
  });
  return teams;
};
