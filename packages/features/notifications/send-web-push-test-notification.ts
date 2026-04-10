import { WEBAPP_URL } from "@calcom/lib/constants";

import type { BrowserPushSubscription } from "./web-push-subscription-schema";
import { sendNotification } from "./sendNotification";

export function sendWebPushTestNotification(parsed: BrowserPushSubscription): void {
  void sendNotification({
    subscription: {
      endpoint: parsed.endpoint,
      keys: {
        auth: parsed.keys.auth,
        p256dh: parsed.keys.p256dh,
      },
    },
    title: "Test Notification",
    body: "Push Notifications activated successfully",
    url: `${WEBAPP_URL}/`,
    requireInteraction: false,
    type: "TEST_NOTIFICATION",
  });
}
