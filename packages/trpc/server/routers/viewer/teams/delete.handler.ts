import { TeamBilling } from "@calcom/features/ee/billing/teams";
import { deleteDomain } from "@calcom/lib/domainManager/organization";
import { isTeamOwner } from "@calcom/lib/server/queries/teams";
import { closeComDeleteTeam } from "@calcom/lib/sync/SyncServiceManager";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TDeleteInputSchema } from "./delete.schema";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteInputSchema;
};

export const deleteHandler = async ({ ctx, input }: DeleteOptions) => {
  if (!(await isTeamOwner(ctx.user?.id, input.teamId))) throw new TRPCError({ code: "UNAUTHORIZED" });
  const teamBilling = TeamBilling.findAndCreate(input.teamId);
  await teamBilling.cancel();
  const deletedTeam = await prisma.$transaction(async (tx) => {
    // delete all memberships
    await tx.membership.deleteMany({
      where: {
        teamId: input.teamId,
      },
    });

    const deletedTeam = await tx.team.delete({
      where: {
        id: input.teamId,
      },
    });
    return deletedTeam;
  });

  if (deletedTeam?.isOrganization && deletedTeam.slug) deleteDomain(deletedTeam.slug);

  // Sync Services: Close.cm
  closeComDeleteTeam(deletedTeam);
};

export default deleteHandler;
