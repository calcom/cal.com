import type { WorkflowContext } from "@calid/job-dispatcher";

import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import type { RazorpayAppRevokedJobData } from "./type";

const log = logger.getSubLogger({ prefix: ["[job-engine/razorpay-app-revoked]"] });

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function detachAppFromEvents(where: Prisma.EventTypeWhereInput) {
  try {
    const eventTypes = await prisma.eventType.findMany({ where });

    for (const eventType of eventTypes) {
      try {
        const metadata = isPrismaObjOrUndefined(eventType.metadata);

        if (metadata?.apps && isPrismaObjOrUndefined(metadata?.apps)?.razorpay) {
          delete isPrismaObjOrUndefined(metadata.apps)?.razorpay;

          await prisma.eventType.update({
            where: { id: eventType.id },
            data: { metadata },
          });
        }
      } catch (error) {
        log.error(`Failed to detach app from event type ${eventType.id}:`, error);
      }
    }
  } catch (error) {
    log.error("Failed to fetch event types:", error);
    throw error;
  }
}

// ============================================================================
// MAIN WORKFLOW EXPORT
// ============================================================================

export async function razorpayAppRevokedService(
  ctx: WorkflowContext,
  payload: RazorpayAppRevokedJobData
): Promise<{ success: boolean; message: string }> {
  const { accountId } = payload;

  log.info(`Processing APP_REVOKED for account: ${accountId}`);

  // Step 1: Find credential
  const credential = await ctx.run("find-credential", async () => {
    return await prisma.credential.findFirst({
      where: {
        key: {
          path: ["account_id"],
          equals: accountId,
        },
        appId: "razorpay",
      },
    });
  });

  if (!credential) {
    log.warn(`No credentials found for account_id: ${accountId}`);
    return { success: true, message: "Credential not found" };
  }

  const userId = credential.userId;
  const calIdTeamId = credential.calIdTeamId;

  // Step 2: Detach app from user events (non-critical)
  if (userId) {
    await ctx.run("detach-user-events", async () => {
      try {
        await detachAppFromEvents({
          metadata: { not: undefined },
          userId,
        });
        log.info(`Detached app from user ${userId} events`);
      } catch (error) {
        log.error(`Failed to detach app from user ${userId} events:`, error);
        // Non-critical - swallow error
      }
    });
  }

  // Step 3: Detach app from team events (non-critical)
  if (calIdTeamId) {
    await ctx.run("detach-team-events", async () => {
      try {
        await detachAppFromEvents({
          metadata: { not: undefined },
          calIdTeamId,
        });
        log.info(`Detached app from team ${calIdTeamId} events`);
      } catch (error) {
        log.error(`Failed to detach app from team ${calIdTeamId} events:`, error);
        // Non-critical - swallow error
      }
    });
  }

  // Step 4: Delete credential (critical)
  await ctx.run("delete-credential", async () => {
    await prisma.credential.delete({
      where: { id: credential.id },
    });
    log.info(`Successfully deleted credential for account_id: ${accountId}`);
  });

  ctx.log(`Successfully revoked app for account: ${accountId}`);

  return {
    success: true,
    message: `Successfully revoked app for account: ${accountId}`,
  };
}
