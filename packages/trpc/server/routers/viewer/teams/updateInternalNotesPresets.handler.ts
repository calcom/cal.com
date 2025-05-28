import { isTeamAdmin } from "@calcom/lib/server/queries/teams";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TUpdateInternalNotesPresetsInputSchema } from "./updateInternalNotesPresets.schema";

type UpdateInternalNotesPresetsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateInternalNotesPresetsInputSchema;
};

export const updateInternalNotesPresetsHandler = async ({
  ctx,
  input,
}: UpdateInternalNotesPresetsOptions) => {
  const isOrgAdmin = ctx.user?.organization?.isOrgAdmin;

  if (!isOrgAdmin) {
    if (!(await isTeamAdmin(ctx.user?.id, input.teamId))) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
  }

  // Update or create presets using TeamRepository
  const updatedPresets = await TeamRepository.updateInternalNotesPresets({
    teamId: input.teamId,
    presets: input.presets,
  });

  return updatedPresets;
};

export default updateInternalNotesPresetsHandler;
