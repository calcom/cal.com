import { isTeamMember } from "@calcom/lib/server/queries/teams";
import { TeamRepository } from "@calcom/lib/server/repository/team";
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
  if (!(await isTeamMember(ctx.user?.id, input.teamId))) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return await TeamRepository.getInternalNotesPresets({
    teamId: input.teamId,
  });
};

export default getInternalNotesPresetsHandler;
