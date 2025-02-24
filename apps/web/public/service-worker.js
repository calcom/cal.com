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

  const title = notificationData.title || "You have a new notification from Cal.com";
  const image = "https://cal.com/api/logo?type=icon";
  const newNotificationOptions = {
    requireInteraction: true,
    ...notificationData,
    icon: image,
    badge: image,
    data: {
      url: notificationData.data?.url || "https://app.cal.com",
    },
    silent: false,
    vibrate: [300, 100, 400],
    tag: `notification-${Date.now()}-${Math.random()}`,
  };

  const existingNotifications = await self.registration.getNotifications();

  // Display each existing notification again to make sure old ones can still be clicked
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

  // Show the new notification
  self.registration.showNotification(title, newNotificationOptions);
});

self.addEventListener("notificationclick", (event) => {
  if (!event.action) {
    // Normal Notification Click
    event.notification.close();
    const url = event.notification.data.url;
    event.waitUntil(self.clients.openWindow(url));
  }

  switch (event.action) {
    case "connect-action":
      event.notification.close();
      const url = event.notification.data.url;
      event.waitUntil(self.clients.openWindow(url));
      break;
  }
});
