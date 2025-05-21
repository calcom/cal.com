import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import type { TrpcSessionUser } from "../../../types";
import { checkPermissions } from "./_auth-middleware";
import type { TFindKeyOfTypeInputSchema } from "./findKeyOfType.schema";

type FindKeyOfTypeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TFindKeyOfTypeInputSchema;
};

export const findKeyOfTypeHandler = async ({ ctx, input }: FindKeyOfTypeOptions) => {
  const { teamId, appId } = input;
  const userId = ctx.user.id;
  /** Only admin or owner can create apiKeys of team (if teamId is passed) */
  await checkPermissions({ userId, teamId, role: { in: [MembershipRole.OWNER, MembershipRole.ADMIN] } });

  return await prisma.apiKey.findMany({
    where: {
      teamId,
      userId,
      appId,
    },
  });
};
