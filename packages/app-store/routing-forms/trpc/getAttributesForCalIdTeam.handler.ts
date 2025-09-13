import { getAttributesForCalIdTeam } from "@calcom/lib/service/attribute/server/getAttributes";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TGetAttributesForCalIdTeamInputSchema } from "./getAttributesForCalIdTeam.schema";

type GetAttributesForCalIdTeamHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetAttributesForCalIdTeamInputSchema;
};

export default async function getAttributesForCalIdTeamHandler({
  ctx,
  input,
}: GetAttributesForCalIdTeamHandlerOptions) {
  const { calIdTeamId } = input;
  const { user } = ctx;
  
  // Check if user is a member of the calId team
  const isMemberOfCalIdTeam = await prisma.calIdMembership.findFirst({
    where: {
      userId: user.id,
      calIdTeamId,
      acceptedInvitation: true,
    },
  });

  if (!isMemberOfCalIdTeam) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "You are not a member of this team",
    });
  }

  return getAttributesForCalIdTeam({ calIdTeamId });
}
