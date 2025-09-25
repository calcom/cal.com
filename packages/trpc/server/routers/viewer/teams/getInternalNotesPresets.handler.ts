import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TGetInternalNotesPresetsInputSchema } from "./getInternalNotesPresets.schema";

type UpdateMembershipOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetInternalNotesPresetsInputSchema;
};

export const getInternalNotesPresetsHandler = async ({ ctx, input }: UpdateMembershipOptions) => {
  const membership = await MembershipRepository.findUniqueByUserIdAndTeamId({
    userId: ctx.user.id,
    teamId: input.teamId,
  });

  if (!membership) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "User is not a member of this team" });
  }

  return await prisma.internalNotePreset.findMany({
    where: {
      teamId: input.teamId,
    },
    select: {
      id: true,
      name: true,
      cancellationReason: true,
    },
  });
};

export default getInternalNotesPresetsHandler;
