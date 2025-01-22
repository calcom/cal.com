import { isTeamMember } from "@calcom/lib/server/queries/teams";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TGetInternalNotesPresetsInputSchema } from "./getInternalNotesPresets.schema";

type UpdateMembershipOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetInternalNotesPresetsInputSchema;
};

export const getInternalNotesPresetsHandler = async ({ ctx, input }: UpdateMembershipOptions) => {
  if (!(await isTeamMember(ctx.user?.id, input.teamId))) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
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
