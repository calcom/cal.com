import prisma from "@calcom/prisma";

/**
 * Cleanup old queued form responses that have null actualResponseId and are older than specified time
 */
export async function cleanupExpiredQueuedFormResponses(olderThanHours = 1) {
  const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

  const deleted = await prisma.app_RoutingForms_QueuedFormResponse.deleteMany({
    where: {
      AND: [
        {
          actualResponseId: null,
        },
        {
          createdAt: {
            gte: cutoffTime,
          },
        },
      ],
    },
  });

  return { ok: true, count: deleted.count };
}
