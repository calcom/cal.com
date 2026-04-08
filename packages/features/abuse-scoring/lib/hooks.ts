import logger from "@calcom/lib/logger";
import type { AbuseScoringReason } from "./tasker/trigger/schema";

const log = logger.getSubLogger({ prefix: ["abuse-scoring:hooks"] });

/** Gate 1 — Called after signup to analyze the new user via rule engine. Async, fail-open. */
export async function onSignup(userId: number): Promise<void> {
  try {
    const { getAbuseScoringService } = await import("../di/AbuseScoringService.container");
    const service = getAbuseScoringService();

    const shouldAnalyze = await service.shouldMonitor(userId);
    if (!shouldAnalyze) return;

    const { getAbuseScoringTasker } = await import("../di/tasker/AbuseScoringTasker.container");
    const tasker = getAbuseScoringTasker();
    await tasker.analyzeUser({ payload: { userId, reason: "signup" } });
  } catch (err) {
    log.error("onSignup failed", {
      userId,
      error: err instanceof Error ? err.message : err,
    });
  }
}

/** Gate 2 — Called when an EventType is created or updated. */
export async function onEventTypeChange(userId: number): Promise<void> {
  try {
    const { getAbuseScoringService } = await import("../di/AbuseScoringService.container");
    const service = getAbuseScoringService();

    const shouldCheck = await service.shouldUsersCheckEventType(userId);
    if (!shouldCheck) return;

    const { getAbuseScoringTasker } = await import("../di/tasker/AbuseScoringTasker.container");
    const tasker = getAbuseScoringTasker();
    await tasker.analyzeUser({
      payload: { userId, reason: "event_type_change" },
    });
  } catch (err) {
    log.error("onEventTypeChange failed", {
      userId,
      error: err instanceof Error ? err.message : err,
    });
  }
}

/** Internal — shared logic for booking event gates (Gate 3 and Gate 4). */
async function analyzeOnBookingEvent(userId: number, reason: AbuseScoringReason): Promise<void> {
  const { getAbuseScoringService } = await import("../di/AbuseScoringService.container");
  const service = getAbuseScoringService();

  if (!(await service.shouldAnalyzeOnBooking(userId))) return;

  const { getAbuseScoringTasker } = await import("../di/tasker/AbuseScoringTasker.container");
  const tasker = getAbuseScoringTasker();
  await tasker.analyzeUser({ payload: { userId, reason } });
}

/** Gate 3 — Called when a booking is created. Analyzes all new accounts (< 7 days). */
export async function onBookingCreated(userId: number): Promise<void> {
  try {
    await analyzeOnBookingEvent(userId, "booking_created");
  } catch (err) {
    log.error("onBookingCreated failed", {
      userId,
      error: err instanceof Error ? err.message : err,
    });
  }
}

/** Gate 4 — Called when a booking is cancelled. Re-evaluates with cancellation reason data. */
export async function onBookingCancelled(userId: number): Promise<void> {
  try {
    await analyzeOnBookingEvent(userId, "booking_cancelled");
  } catch (err) {
    log.error("onBookingCancelled failed", {
      userId,
      error: err instanceof Error ? err.message : err,
    });
  }
}

/** Gate 5 — Called when a workflow is created or updated. */
export async function onWorkflowChange(userId: number): Promise<void> {
  try {
    const { getAbuseScoringService } = await import("../di/AbuseScoringService.container");
    const service = getAbuseScoringService();

    const shouldCheck = await service.shouldUsersCheckEventType(userId);
    if (!shouldCheck) return;

    const { getAbuseScoringTasker } = await import("../di/tasker/AbuseScoringTasker.container");
    const tasker = getAbuseScoringTasker();
    await tasker.analyzeUser({
      payload: { userId, reason: "workflow_change" },
    });
  } catch (err) {
    log.error("onWorkflowChange failed", {
      userId,
      error: err instanceof Error ? err.message : err,
    });
  }
}
