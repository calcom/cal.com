export const apiHandlers = {
  // examplevideo: import("./_example/api"),
  applecalendar: import("./applecalendar/api"),
  caldavcalendar: import("./caldavcalendar/api"),
  googlecalendar: import("./googlecalendar/api"),
  hubspotothercalendar: import("./hubspotothercalendar/api"),
  office365calendar: import("./office365calendar/api"),
  slackmessaging: import("./slackmessaging/api"),
  stripepayment: import("./stripepayment/api"),
  tandemvideo: import("./tandemvideo/api"),
  zoomvideo: import("@calcom/zoomvideo/api"),
  office365video: import("@calcom/office365video/api"),
  wipemycalother: import("./wipemycalother/api"),
  jitsivideo: import("./jitsivideo/api"),
  huddle01video: import("./huddle01video/api"),
  giphy: import("./giphy/api"),
};

export default apiHandlers;
