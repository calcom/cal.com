self.addEventListener("push", async (event) => {
  console.log("push event", event);
  let notificationData = event.data.json();

  const allClients = await clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  console.log("allClients", allClients);

  // if (allClients.length) {
  //   allClients.forEach(client => {
  //     client.postMessage({
  //       type: 'PLAY_NOTIFICATION_SOUND'
  //     })
  //   })
  // }

  // if (!allClients.length) {
  //   console.log("No open tabs, skipping the push notification.");
  //   return;
  // }

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
  console.log("existingNotifications", existingNotifications);

  // Display each existing notification again to make sure old ones can still be clicked
  // Show each existing notification again with a unique tag
  const showExistingPromises = existingNotifications.map((notification, index) => {
    const options = {
      body: notification.body,
      icon: notification.icon,
      badge: notification.badge,
      data: notification.data,
      silent: true, // Don't play sound for re-shown notifications
      vibrate: notification.vibrate,
      requireInteraction: notification.requireInteraction,
      tag: `existing-notification-${Date.now()}-${index}`, // Ensure unique tag
    };
    return self.registration.showNotification(notification.title, options);
  });

  const firstClient = allClients[0];
  if (firstClient) {
    firstClient.postMessage({
      type: 'PLAY_NOTIFICATION_SOUND'
    })
  }

    // Wait for all notifications to be shown
    event.waitUntil(
      Promise.all([
        ...showExistingPromises,
        self.registration.showNotification(title, newNotificationOptions)
      ])
    );

});

self.addEventListener("notificationclick", (event) => {
  // Notify all clients to stop the sound
  const stopSound = async () => {
    const allClients = await clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    })

    allClients.forEach(client => {
      client.postMessage({
        type: 'STOP_NOTIFICATION_SOUND'
      })
    })
  }

  if (!event.action) {
    // Normal Notification Click
    event.notification.close()
    const url = event.notification.data.url
    stopSound()
    event.waitUntil(self.clients.openWindow(url))
  }

  switch (event.action) {
    case "connect-action":
      event.notification.close()
      const url = event.notification.data.url
      stopSound()
      event.waitUntil(self.clients.openWindow(url))
      break
  }
})
