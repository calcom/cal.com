import TrevoSDK from "@trevosdk/browser";

import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["[trevo]"] });

export const TREVO_DEFAULT_VARIANT = "control";

let initialized = false;
let identifiedUserId: string | null = null;

export function initTrevo(): void {
  if (initialized) return;
  const apiKey = process.env.NEXT_PUBLIC_TREVO_SDK_KEY;
  if (!apiKey) return;
  try {
    TrevoSDK.init({ apiKey });
    initialized = true;
  } catch (error) {
    log.error("Failed to initialize Trevo SDK", { error });
  }
}

export function identifyTrevoUser(userId: string): void {
  if (!initialized || identifiedUserId === userId) return;
  try {
    TrevoSDK.identify(userId);
    identifiedUserId = userId;
  } catch (error) {
    log.error("Failed to identify Trevo user", { error });
  }
}

export function getTrevoVariant(experimentKey: string): string {
  if (!initialized) return TREVO_DEFAULT_VARIANT;
  try {
    return TrevoSDK.getVariant(experimentKey);
  } catch (error) {
    log.error("Failed to get Trevo variant", { experimentKey, error });
    return TREVO_DEFAULT_VARIANT;
  }
}

export function trackTrevoEvent(eventName: string, properties?: Record<string, unknown>): void {
  if (!initialized) return;
  try {
    TrevoSDK.track(eventName, properties);
  } catch (error) {
    log.error("Failed to track Trevo event", { eventName, error });
  }
}
