import { isTeamAdmin } from "@calcom/lib/server/queries/teams";
import { prisma } from "@calcom/prisma";
import { TRPCError } from "@calcom/trpc/server";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

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

  const oneDay = 24 * 60 * 60 * 1000;
  const expires = expiresInDays ? new Date(Date.now() + expiresInDays * oneDay) : new Date();

  await prisma.verificationToken.update({
    where: { token },
    data: {
      expires,
      expiresInDays,
    },
  });
};
