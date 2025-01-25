import { isTeamAdmin } from "@calcom/lib/server/queries/teams";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

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

  // Get existing presets to handle deletions
  const existingPresets = await prisma.internalNotePreset.findMany({
    where: {
      teamId: input.teamId,
    },
    select: {
      id: true,
    },
  });

  const existingIds = existingPresets.map((preset) => preset.id);
  const updatedIds = input.presets.map((preset) => preset.id).filter((id): id is number => id !== undefined);

  // Find IDs to delete (existing IDs that aren't in the update)
  const idsToDelete = existingIds.filter((id) => !updatedIds.includes(id));

  // Delete removed presets
  if (idsToDelete.length > 0) {
    await prisma.internalNotePreset.deleteMany({
      where: {
        id: {
          in: idsToDelete,
        },
        teamId: input.teamId,
      },
    });
  }

  // Update or create presets
  const updatedPresets = await Promise.all(
    input.presets.map((preset) => {
      if (preset.id && preset.id !== -1) {
        // Update existing preset
        return prisma.internalNotePreset.update({
          where: {
            id: preset.id,
            teamId: input.teamId,
          },
          data: {
            name: preset.name,
            cancellationReason: preset.cancellationReason,
          },
        });
      } else {
        // Create new preset
        return prisma.internalNotePreset.create({
          data: {
            name: preset.name,
            cancellationReason: preset.cancellationReason,
            teamId: input.teamId,
          },
        });
      }
    })
  );

  return updatedPresets;
};

export default updateInternalNotesPresetsHandler;
