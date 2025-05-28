import { isTeamAdmin } from "@calcom/lib/server/queries/teams";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TSetInviteExpirationInputSchema } from "./setInviteExpiration.schema";

type SetInviteExpirationOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TSetInviteExpirationInputSchema;
};

export const setInviteExpirationHandler = async ({ ctx, input }: SetInviteExpirationOptions) => {
  const { token, expiresInDays } = input;

  const verificationToken = await prisma.verificationToken.findFirst({
    where: {
      token: token,
    },
    select: {
      teamId: true,
    },
  });

  if (!verificationToken) throw new TRPCError({ code: "NOT_FOUND" });
  if (!verificationToken.teamId || !(await isTeamAdmin(ctx.user.id, verificationToken.teamId)))
    throw new TRPCError({ code: "UNAUTHORIZED" });

  await TeamRepository.setInviteExpiration({
    token,
    expiresInDays: expiresInDays ?? null,
  });
};

export default setInviteExpirationHandler;
