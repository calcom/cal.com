import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["CleanupExpiredPendingGuests"] });

export async function cleanupExpiredPendingGuests() {
  try {
    const result = await prisma.pendingGuest.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    log.info(`Cleaned up ${result.count} expired pending guest records`);
    return result.count;
  } catch (error) {
    log.error("Error cleaning up expired pending guests:", error);
    throw error;
  }
}
