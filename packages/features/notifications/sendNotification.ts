import process from "node:process";
import { Logger } from "@nestjs/common";
import webpush from "web-push";

const logger = new Logger("WebPush");
let isVapidConfigured = false;

const vapidKeys = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
  privateKey: process.env.VAPID_PRIVATE_KEY || "",
};

if (vapidKeys.publicKey && vapidKeys.privateKey) {
  try {
    // The mail to email address should be the one at which push service providers can reach you. It can also be a URL.
    webpush.setVapidDetails("mailto:support@cal.com", vapidKeys.publicKey, vapidKeys.privateKey);
    logger.log("VAPID keys loaded. Web push enabled.");
    isVapidConfigured = true;
  } catch (err) {
    logger.error("Failed to initialize web push", err);
  }
} else {
  logger.warn("Missing VAPID keys. Web push notifications are disabled.");
}

type Subscription = {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
};

export const sendNotification = async ({
  subscription,
  title,
  body,
  icon,
  url,
  actions,
  requireInteraction,
  type = "INSTANT_MEETING",
}: {
  subscription: Subscription;
  title: string;
  body: string;
  icon?: string;
  url?: string;
  actions?: { action: string; title: string; type: string; image: string | null }[];
  requireInteraction?: boolean;
  type?: string;
}) => {
  if (!isVapidConfigured) {
    logger.error("Cannot send notification. VAPID keys not configured.");
    return;
  }
  try {
    const payload = JSON.stringify({
      title,
      body,
      icon,
      data: {
        url,
        type,
      },
      actions,
      requireInteraction,
      tag: `cal-notification-${Date.now()}`,
    });
    await webpush.sendNotification(subscription, payload);
  } catch (error) {
    logger.error("Error sending notification", error);
  }
};
