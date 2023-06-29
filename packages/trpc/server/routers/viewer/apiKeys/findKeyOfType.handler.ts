import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TFindKeyOfTypeInputSchema } from "./findKeyOfType.schema";

type FindKeyOfTypeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TFindKeyOfTypeInputSchema;
};

export const findKeyOfTypeHandler = async ({ ctx, input }: FindKeyOfTypeOptions) => {
  const OR = [{ userId: ctx.user.id }];

  if (input.teamId) {
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
          membership.teamId === input.teamId &&
          (membership.role === MembershipRole.ADMIN || membership.role === MembershipRole.OWNER)
      );

    if (!userHasAdminOwnerPermissionInTeam) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
      });
    }

    OR.push({ teamId: input.teamId });
  }

  return await prisma.apiKey.findMany({
    where: {
      AND: [
        {
          OR,
        },
        {
          appId: input.appId,
        },
      ],
    },
  });
};
