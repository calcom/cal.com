import { v4 } from "uuid";

import { generateUniqueAPIKey } from "@calcom/ee/api-keys/lib/apiKeys";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TCreateInputSchema } from "./create.schema";

type CreateHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateInputSchema;
};

export const createHandler = async ({ ctx, input }: CreateHandlerOptions) => {
  const [hashedApiKey, apiKey] = generateUniqueAPIKey();

  // Here we snap never expires before deleting it so it's not passed to prisma create call.
  const { neverExpires, teamId, ...rest } = input;

  if (teamId) {
    const user = await prisma.user.findFirst({
      where: {
        id: ctx.user.id,
      },
      include: {
        teams: true,
      },
    });

    const userHasAdminOwnerPermissionInTeam =
      user &&
      user.teams.some(
        (membership) =>
          membership.teamId === teamId &&
          (membership.role === MembershipRole.ADMIN || membership.role === MembershipRole.OWNER)
      );

    if (!userHasAdminOwnerPermissionInTeam) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
      });
    }
  }

  await prisma.apiKey.create({
    data: {
      id: v4(),
      userId: ctx.user.id,
      teamId: teamId,
      ...rest,
      // And here we pass a null to expiresAt if never expires is true. otherwise just pass expiresAt from input
      expiresAt: neverExpires ? null : rest.expiresAt,
      hashedKey: hashedApiKey,
    },
  });

  const apiKeyPrefix = process.env.API_KEY_PREFIX ?? "cal_";

  const prefixedApiKey = `${apiKeyPrefix}${apiKey}`;

  return prefixedApiKey;
};
