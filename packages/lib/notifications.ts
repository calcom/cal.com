import { MOBILE_NOTIFICATIONS_ENABLED } from "@calcom/lib/constants";

type NotificationPayload = {
  title: string;
  body: string;
};

export async function sendMobileNotification(
  topic: string,
  payload: NotificationPayload,
  metadata: Record<string, unknown> = {}
): Promise<string | "skipped:disabled" | "skipped:unavailable"> {
  if (!MOBILE_NOTIFICATIONS_ENABLED) return "skipped:disabled";
  try {
    const mod = await import("@calcom/lib/firebaseAdmin");
    const firebaseService = mod.default as {
      sendNotification: (
        topic: string,
        payload: NotificationPayload,
        metadata?: Record<string, unknown>
      ) => Promise<string>;
    };
    return await firebaseService.sendNotification(topic, payload, metadata);
  } catch (error) {
    // If firebase is not configured or import fails at runtime, do not crash the caller
    return "skipped:unavailable";
  }
}


