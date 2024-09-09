self.addEventListener("push", (event) => {
  let notificationData = event.data.json();

  const title = notificationData.title || "You have new notification from Cal.com";
  const image ="/cal-com-icon.svg";
  const options = {
    ...notificationData.options,
    icon: image,
  };
  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data.targetURL || "https://app.cal.com"));
});
