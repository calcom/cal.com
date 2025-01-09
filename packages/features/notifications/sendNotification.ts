import webpush from "web-push";

const vapidKeys = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
  privateKey: process.env.VAPID_PRIVATE_KEY || "",
};

// The mail to email address should be the one at which push service providers can reach you. It can also be a URL.
webpush.setVapidDetails("https://cal.com", vapidKeys.publicKey, vapidKeys.privateKey);

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
}: {
  subscription: Subscription;
  title: string;
  body: string;
  icon?: string;
  url?: string;
  actions?: { action: string; title: string; type: string; image: string | null }[];
  requireInteraction?: boolean;
}) => {
  try {
    const payload = JSON.stringify({
      title,
      body,
      icon,
      data: {
        url,
      },
      actions,
      requireInteraction,
    });
    console.log("sendendcasdcasdcsad", payload);
    await webpush.sendNotification(subscription, payload);
  } catch (error) {
    console.error("Error sending notification", error);
  }
};
