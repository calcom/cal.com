import { calid_getAttributesForTeam } from "@calcom/lib/service/attribute/server/getAttributes";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TCalIdGetAttributesForTeamInputSchema } from "./getAttributesForTeam.schema";

type CalIdGetAttributesForTeamHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCalIdGetAttributesForTeamInputSchema;
};

export default async function calIdGetAttributesForTeamHandler({
  ctx,
  input,
}: CalIdGetAttributesForTeamHandlerOptions) {
  const { teamId } = input;
  const { user } = ctx;

  // Check if user is a member of the calId team
  const isMemberOfCalIdTeam = await prisma.calIdMembership.findFirst({
    where: {
      userId: user.id,
      calIdTeamId: teamId,
      acceptedInvitation: true,
    },
  });

  if (!isMemberOfCalIdTeam) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "You are not a member of this team",
    });
  }

  return calid_getAttributesForTeam({ teamId });
}
