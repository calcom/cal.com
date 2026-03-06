import logger from "@calcom/lib/logger";

import type { SignupCheckResult } from "../types";

const log = logger.getSubLogger({ prefix: ["abuse-scoring:hooks"] });

const UNFLAGGED: SignupCheckResult = {
  flagged: false,
  flags: [],
  initialScore: 0,
};

/** Gate 1 — Called during signup to check email/username against watchlist patterns. */
export async function onSignup(
  email: string,
  username?: string
): Promise<SignupCheckResult> {
  try {
    const { getAbuseScoringService } = await import(
      "../di/AbuseScoringService.container"
    );
    const service = getAbuseScoringService();
    return await service.checkSignup(email, username);
  } catch (err) {
    log.error("onSignup failed", {
      email,
      error: err instanceof Error ? err.message : err,
    });
    return UNFLAGGED;
  }
}

/** Gate 2 — Called when an EventType is created or updated. */
export async function onEventTypeChange(userId: number): Promise<void> {
  try {
    const { getAbuseScoringService } = await import(
      "../di/AbuseScoringService.container"
    );
    const service = getAbuseScoringService();

    const shouldCheck = await service.shouldUsersCheckEventType(userId);
    if (!shouldCheck) return;

    const { getAbuseScoringTasker } = await import(
      "../di/tasker/AbuseScoringTasker.container"
    );
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

/** Gate 3 — Called when a booking is created. Analyzes all new accounts (< 7 days). */
export async function onBookingCreated(userId: number): Promise<void> {
  try {
    const { getAbuseScoringService } = await import(
      "../di/AbuseScoringService.container"
    );
    const service = getAbuseScoringService();

    if (!(await service.shouldAnalyzeOnBooking(userId))) return;

    const { getAbuseScoringTasker } = await import(
      "../di/tasker/AbuseScoringTasker.container"
    );
    const tasker = getAbuseScoringTasker();
    await tasker.analyzeUser({
      payload: { userId, reason: "booking_created" },
    });
  } catch (err) {
    log.error("onBookingCreated failed", {
      userId,
      error: err instanceof Error ? err.message : err,
    });
  }
}
