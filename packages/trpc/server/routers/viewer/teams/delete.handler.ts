import { checkPermissionWithFallback } from "@calcom/features/pbac/lib/checkPermissionWithFallback";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TDeleteInputSchema } from "./delete.schema";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteInputSchema;
};

export const deleteHandler = async ({ ctx, input }: DeleteOptions) => {
  if (
    !(await checkPermissionWithFallback({
      userId: ctx.user?.id,
      teamId: input.teamId,
      permission: "team.changeMemberRole",
      fallbackRoles: [MembershipRole.OWNER],
    }))
  )
    throw new TRPCError({ code: "UNAUTHORIZED" });

  return await TeamRepository.deleteById({ id: input.teamId });
};

export default deleteHandler;
