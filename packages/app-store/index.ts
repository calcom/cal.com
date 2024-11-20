const appStore = {
  // example: () => import("../apps/example"),
  alby: () => import("../apps/alby"),
  applecalendar: () => import("../apps/applecalendar"),
  aroundvideo: () => import("../apps/around"),
  caldavcalendar: () => import("../apps/caldavcalendar"),
  campsiteconferencing: () => import("../apps/campsite"),
  closecom: () => import("../apps/closecom"),
  dailyvideo: () => import("../apps/dailyvideo"),
  googlecalendar: () => import("../apps/googlecalendar"),
  googlevideo: () => import("../apps/googlevideo"),
  hubspot: () => import("../apps/hubspot"),
  huddle01video: () => import("../apps/huddle01video"),
  "ics-feedcalendar": () => import("../apps/ics-feedcalendar"),
  jellyconferencing: () => import("../apps/jelly"),
  jitsivideo: () => import("../apps/jitsivideo"),
  larkcalendar: () => import("../apps/larkcalendar"),
  nextcloudtalkvideo: () => import("../apps/nextcloudtalk"),
  office365calendar: () => import("../apps/office365calendar"),
  office365video: () => import("../apps/office365video"),
  plausible: () => import("../apps/plausible"),
  paypal: () => import("../apps/paypal"),
  "pipedrive-crm": () => import("../apps/pipedrive-crm"),
  salesforce: () => import("../apps/salesforce"),
  zohocrm: () => import("../apps/zohocrm"),
  sendgrid: () => import("../apps/sendgrid"),
  stripepayment: () => import("../apps/stripepayment"),
  tandemvideo: () => import("../apps/tandemvideo"),
  vital: () => import("../apps/vital"),
  zoomvideo: () => import("../apps/zoomvideo"),
  wipemycalother: () => import("../apps/wipemycalother"),
  webexvideo: () => import("../apps/webex"),
  giphy: () => import("../apps/giphy"),
  zapier: () => import("../apps/zapier"),
  make: () => import("../apps/make"),
  exchange2013calendar: () => import("../apps/exchange2013calendar"),
  exchange2016calendar: () => import("../apps/exchange2016calendar"),
  exchangecalendar: () => import("../apps/exchangecalendar"),
  facetime: () => import("../apps/facetime"),
  sylapsvideo: () => import("../apps/sylapsvideo"),
  zohocalendar: () => import("../apps/zohocalendar"),
  "zoho-bigin": () => import("../apps/zoho-bigin"),
  basecamp3: () => import("../apps/basecamp3"),
  telegramvideo: () => import("../apps/telegram"),
  shimmervideo: () => import("../apps/shimmervideo"),
};

const exportedAppStore: typeof appStore & {
  ["mock-payment-app"]?: () => Promise<typeof import("../apps/mock-payment-app/index")>;
} = appStore;

if (process.env.MOCK_PAYMENT_APP_ENABLED !== undefined) {
  exportedAppStore["mock-payment-app"] = () => import("../apps/mock-payment-app/index");
}

export default exportedAppStore;
