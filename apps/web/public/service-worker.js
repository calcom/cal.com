self.addEventListener("push", async (event) => {
  let notificationData = event.data.json();

  const allClients = await clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  if (!allClients.length) {
    console.log("No open tabs, skipping the push notification.");
    return;
  }

  const title = notificationData.title || "New Cal.com Notification";
  const image = notificationData.icon || "https://cal.com/api/logo?type=icon";

  // Special handling for instant meetings
  if (notificationData.data?.type === "INSTANT_MEETING") {
    allClients.forEach(client => {
      client.postMessage({
        type: 'PLAY_NOTIFICATION_SOUND'
      });
    });
  }

  const existingNotifications = await self.registration.getNotifications();

  existingNotifications.forEach((notification) => {
    const options = {
      body: notification.body,
      icon: notification.icon,
      badge: notification.badge,
      data: notification.data,
      silent: notification.silent,
      vibrate: notification.vibrate,
      requireInteraction: notification.requireInteraction,
      tag: notification.tag,
    };

    self.registration.showNotification(notification.title, options);
  });

    const notificationOptions = {
      body: notificationData.body,
      icon: image,
      badge: image,
      data: notificationData.data,
      tag: notificationData.tag || `cal-notification-${Date.now()}`,
      renotify: true,
      requireInteraction: notificationData.requireInteraction ?? true,
      actions: notificationData.actions || [],
      vibrate: [200, 100, 200],
   };

  try {
    await self.registration.showNotification(title, notificationOptions);
    console.log("Notification shown successfully");
  } catch (error) {
    console.error("Error showing notification:", error);
  }
});

self.addEventListener("notificationclick", (event) => {

  if (event.notification.data?.type === "INSTANT_MEETING") {
    const stopSound = async () => {
      const allClients = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      allClients.forEach(client => {
        client.postMessage({
          type: 'STOP_NOTIFICATION_SOUND'
        });
      });
    };

    event.waitUntil(Promise.all([
      stopSound(),
      clients.openWindow(event.notification.data.url)
    ]));
  } else {
    // Handle regular notifications
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || "https://app.cal.com")
    );
  }
});

self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated.');
});
