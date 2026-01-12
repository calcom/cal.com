import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
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
    const permissionCheckService = new PermissionCheckService();
    const hasTeamUpdatePermission =
      await permissionCheckService.checkPermission({
        userId: ctx.user?.id || 0,
        teamId: input.teamId,
        permission: "team.update",
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });

    if (!hasTeamUpdatePermission) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
  }

  // Get existing presets to handle deletions (only for the specified type)
  const existingPresets = await prisma.internalNotePreset.findMany({
    where: {
      teamId: input.teamId,
      type: input.type,
    },
    select: {
      id: true,
    },
  });

  const existingIds = existingPresets.map((preset) => preset.id);
  // Filter out placeholder IDs (-1) and undefined values from updated IDs
  const updatedIds = input.presets
    .map((preset) => preset.id)
    .filter((id): id is number => id !== undefined && id !== -1 && id > 0);

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
        type: input.type,
      },
    });
  }

  // Filter out presets with empty names
  const validPresets = input.presets.filter(
    (preset) =>
      preset.name &&
      typeof preset.name === "string" &&
      preset.name.trim().length > 0
  );

  // Update or create presets
  const updatedPresets = await Promise.all(
    validPresets.map(async (preset) => {
      // Check if this is an update (id exists, is not -1, and is > 0)
      if (preset.id !== undefined && preset.id !== -1 && preset.id > 0) {
        // Verify the preset exists and belongs to the correct team and type
        const existingPreset = await prisma.internalNotePreset.findFirst({
          where: {
            id: preset.id,
            teamId: input.teamId,
            type: input.type,
          },
        });

        if (!existingPreset) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Preset with id ${preset.id} not found for this team and type`,
          });
        }

        // Update existing preset
        return prisma.internalNotePreset.update({
          where: {
            id: preset.id,
          },
          data: {
            name: preset.name.trim(),
            cancellationReason: preset.cancellationReason?.trim() || null,
          },
        });
      } else {
        // Create new preset
        try {
          return await prisma.internalNotePreset.create({
            data: {
              name: preset.name.trim(),
              cancellationReason: preset.cancellationReason?.trim() || null,
              teamId: input.teamId,
              type: input.type,
            },
          });
        } catch (error: unknown) {
          // Handle unique constraint violation
          if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "P2002"
          ) {
            throw new TRPCError({
              code: "CONFLICT",
              message: `A preset with the name "${preset.name.trim()}" already exists for this team and type`,
            });
          }
          throw error;
        }
      }
    })
  );

  return updatedPresets;
};

export default updateInternalNotesPresetsHandler;
