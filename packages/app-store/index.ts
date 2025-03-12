const appStore = {
  alby: "@calcom/app-store/alby",
  applecalendar: "@calcom/app-store/applecalendar",
  aroundvideo: "@calcom/app-store/around",
  caldavcalendar: "@calcom/app-store/caldavcalendar",
  campsiteconferencing: "@calcom/app-store/campsite",
  closecom: "@calcom/app-store/closecom",
  dailyvideo: "@calcom/app-store/dailyvideo",
  googlecalendar: "@calcom/app-store/googlecalendar",
  googlevideo: "@calcom/app-store/googlevideo",
  hubspot: "@calcom/app-store/hubspot",
  huddle01video: "@calcom/app-store/huddle01video",
  "ics-feedcalendar": "@calcom/app-store/ics-feedcalendar",
  jellyconferencing: "@calcom/app-store/jelly",
  jitsivideo: "@calcom/app-store/jitsivideo",
  larkcalendar: "@calcom/app-store/larkcalendar",
  nextcloudtalkvideo: "@calcom/app-store/nextcloudtalk",
  office365calendar: "@calcom/app-store/office365calendar",
  office365video: "@calcom/app-store/office365video",
  plausible: "@calcom/app-store/plausible",
  paypal: "@calcom/app-store/paypal",
  "pipedrive-crm": "@calcom/app-store/pipedrive-crm",
  salesforce: "@calcom/app-store/salesforce",
  zohocrm: "@calcom/app-store/zohocrm",
  sendgrid: "@calcom/app-store/sendgrid",
  stripepayment: "@calcom/app-store/stripepayment",
  tandemvideo: "@calcom/app-store/tandemvideo",
  vital: "@calcom/app-store/vital",
  zoomvideo: "@calcom/app-store/zoomvideo",
  wipemycalother: "@calcom/app-store/wipemycalother",
  webexvideo: "@calcom/app-store/webex",
  giphy: "@calcom/app-store/giphy",
  zapier: "@calcom/app-store/zapier",
  make: "@calcom/app-store/make",
  exchange2013calendar: "@calcom/app-store/exchange2013calendar",
  exchange2016calendar: "@calcom/app-store/exchange2016calendar",
  exchangecalendar: "@calcom/app-store/exchangecalendar",
  facetime: "@calcom/app-store/facetime",
  sylapsvideo: "@calcom/app-store/sylapsvideo",
  zohocalendar: "@calcom/app-store/zohocalendar",
  "zoho-bigin": "@calcom/app-store/zoho-bigin",
  basecamp3: "@calcom/app-store/basecamp3",
  telegramvideo: "@calcom/app-store/telegram",
  shimmervideo: "@calcom/app-store/shimmervideo",
  hitpay: "@calcom/app-store/hitpay",
};

const exportedAppStore: typeof appStore & {
  ["mock-payment-app"]?: string;
} = appStore;

if (process.env.MOCK_PAYMENT_APP_ENABLED !== undefined) {
  exportedAppStore["mock-payment-app"] = "@calcom/app-store/mock-payment-app/index";
}

export default exportedAppStore;
