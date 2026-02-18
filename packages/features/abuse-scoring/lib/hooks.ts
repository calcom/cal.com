import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["abuse-scoring:hooks"] });

/** Gate 2 — Called when an EventType is created or updated. */
export async function onEventTypeChange(userId: number): Promise<void> {
  try {
    const { getAbuseScoringService } = await import("../di/AbuseScoringService.container");
    const service = getAbuseScoringService();

    const shouldCheck = await service.shouldCheckEventType(userId);
    if (!shouldCheck) return;

    const { getAbuseScoringTasker } = await import("../di/tasker/AbuseScoringTasker.container");
    const tasker = getAbuseScoringTasker();
    await tasker.analyzeUser({ payload: { userId, reason: "event_type_change" } });
  } catch (err) {
    log.error("onEventTypeChange failed", { userId, error: err instanceof Error ? err.message : err });
  }
}

/** Gate 3 — Called when a booking is created. */
export async function onBookingCreated(userId: number): Promise<void> {
  try {
    const { getAbuseScoringService } = await import("../di/AbuseScoringService.container");
    const service = getAbuseScoringService();

    // Path 1: already flagged user — enqueue analysis
    if (await service.shouldMonitor(userId)) {
      const { getAbuseScoringTasker } = await import("../di/tasker/AbuseScoringTasker.container");
      const tasker = getAbuseScoringTasker();
      await tasker.analyzeUser({ payload: { userId, reason: "booking_flagged" } });
      return;
    }

    // Path 2: unflagged user — check velocity threshold
    if (await service.checkBookingVelocity(userId)) {
      const { getAbuseScoringTasker } = await import("../di/tasker/AbuseScoringTasker.container");
      const tasker = getAbuseScoringTasker();
      await tasker.analyzeUser({ payload: { userId, reason: "booking_velocity" } });
    }
  } catch (err) {
    log.error("onBookingCreated failed", { userId, error: err instanceof Error ? err.message : err });
  }
}
