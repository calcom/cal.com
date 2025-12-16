import { TRPCError } from "@trpc/server";

import { GoogleCalendarOOOSyncService } from "@calcom/features/calendar-subscription/lib/ooo/GoogleCalendarOOOSyncService";
import prisma from "@calcom/prisma";
import { userMetadata } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TEnableOOOSyncInput } from "./oooGoogleCalendarSync.schema";

type Context = { user: NonNullable<TrpcSessionUser> };

/**
 * Get the current OOO sync status for the user
 */
export const getOOOSyncStatus = async ({ ctx }: { ctx: Context }) => {
  // Check if user has Google Calendar connected
  const googleCredential = await prisma.credential.findFirst({
    where: {
      userId: ctx.user.id,
      type: "google_calendar",
      invalid: { not: true },
    },
    select: {
      id: true,
    },
  });

  // Parse user metadata to get sync settings
  const metadata = userMetadata.safeParse(ctx.user.metadata);
  const enabled = metadata.success ? metadata.data?.googleCalendarOOOSyncEnabled ?? false : false;
  const savedCredentialId = metadata.success ? metadata.data?.googleCalendarOOOSyncCredentialId : undefined;

  // Count synced OOO entries
  const syncedCount = await prisma.outOfOfficeEntry.count({
    where: {
      userId: ctx.user.id,
      syncedFromGoogleCalendar: true,
    },
  });

  return {
    hasGoogleCalendar: !!googleCredential,
    credentialId: googleCredential?.id ?? null,
    enabled,
    savedCredentialId: savedCredentialId ?? null,
    syncedEntriesCount: syncedCount,
  };
};

/**
 * Enable or disable Google Calendar OOO sync
 */
export const enableGoogleCalendarOOOSync = async ({
  ctx,
  input,
}: {
  ctx: Context;
  input: TEnableOOOSyncInput;
}) => {
  const { enabled, credentialId } = input;

  // If enabling, verify the credential exists and belongs to the user
  if (enabled) {
    if (!credentialId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "credential_id_required_for_sync" });
    }

    const credential = await prisma.credential.findFirst({
      where: {
        id: credentialId,
        userId: ctx.user.id,
        type: "google_calendar",
        invalid: { not: true },
      },
    });

    if (!credential) {
      throw new TRPCError({ code: "NOT_FOUND", message: "invalid_google_calendar_credential" });
    }
  }

  // Get current metadata
  const currentMetadataResult = userMetadata.safeParse(ctx.user.metadata);
  const currentMetadata = currentMetadataResult.success ? currentMetadataResult.data ?? {} : {};

  // Update user metadata with sync settings
  const newMetadata = {
    ...currentMetadata,
    googleCalendarOOOSyncEnabled: enabled,
    googleCalendarOOOSyncCredentialId: enabled ? credentialId : undefined,
  };

  await prisma.user.update({
    where: { id: ctx.user.id },
    data: { metadata: newMetadata },
  });

  // If enabling, trigger initial sync
  if (enabled && credentialId) {
    const syncService = new GoogleCalendarOOOSyncService(credentialId, ctx.user.id, "primary");
    const result = await syncService.syncOOOEntries();
    return {
      success: true,
      enabled: true,
      syncResult: result,
    };
  }

  // If disabling, delete all synced entries
  if (!enabled) {
    const deletedCount = await prisma.outOfOfficeEntry.deleteMany({
      where: {
        userId: ctx.user.id,
        syncedFromGoogleCalendar: true,
      },
    });

    return {
      success: true,
      enabled: false,
      deletedCount: deletedCount.count,
    };
  }

  return {
    success: true,
    enabled,
  };
};

/**
 * Manually trigger an OOO sync
 */
export const triggerOOOSync = async ({ ctx }: { ctx: Context }) => {
  // Get sync settings from metadata
  const metadata = userMetadata.safeParse(ctx.user.metadata);
  if (!metadata.success || !metadata.data?.googleCalendarOOOSyncEnabled) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "ooo_sync_not_enabled" });
  }

  const credentialId = metadata.data.googleCalendarOOOSyncCredentialId;
  if (!credentialId) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "no_credential_configured_for_sync" });
  }

  // Verify the credential still exists
  const credential = await prisma.credential.findFirst({
    where: {
      id: credentialId,
      userId: ctx.user.id,
      type: "google_calendar",
      invalid: { not: true },
    },
  });

  if (!credential) {
    throw new TRPCError({ code: "NOT_FOUND", message: "google_calendar_credential_not_found" });
  }

  const syncService = new GoogleCalendarOOOSyncService(credentialId, ctx.user.id, "primary");
  return syncService.syncOOOEntries();
};
