self.addEventListener("push", (event) => {
  console.log("push event", event);
  let notificationData = event.data.json();
  console.log("notificationData", notificationData);

  const title = notificationData.title || "You have new notification from Cal.com";
  const image ="https://app.cal.com/api/logo";
  const options = {
    ...notificationData,
    icon: image,
    action: "https://app.cal.com",
    data: {
      url: notificationData.data?.url || "https://app.cal.com",
    },
  };
  self.registration.showNotification(title, options);
});


self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data.url;
  event.waitUntil(self.clients.openWindow(url));
});
