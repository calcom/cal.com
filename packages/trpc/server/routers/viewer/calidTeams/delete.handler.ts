import { deleteDomain } from "@calcom/lib/domainManager/organization";
import prisma from "@calcom/prisma";
import { CalIdMembershipRole } from "@calcom/prisma/client";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { ZDeleteCalidTeamInput } from "./delete.schema";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZDeleteCalidTeamInput;
};

export const deleteCalidTeamHandler = async ({ ctx, input }: DeleteOptions) => {
  const { teamId } = input;
  const userId = ctx.user.id;

  const isTeamOwner = await prisma.calIdMembership.findFirst({
    where: {
      userId,
      calIdTeamId: teamId,
      role: CalIdMembershipRole.OWNER,
    },
  });

  if (!isTeamOwner) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "You are not the owner of this team" });
  }

  // TODO: Delete the scheduledWorkflows for teams

  const deletedTeam = await prisma.calIdTeam.delete({
    where: { id: teamId },
  });

  if (deletedTeam.slug) {
    await deleteDomain(deletedTeam.slug);
  }

  return deletedTeam;
};
