const appStore = {
  // example: () => import("./example"),
  alby: () => import("./alby"),
  applecalendar: () => import("./applecalendar"),
  aroundvideo: () => import("./around"),
  caldavcalendar: () => import("./caldavcalendar"),
  closecom: () => import("./closecom"),
  dailyvideo: () => import("./dailyvideo"),
  googlecalendar: () => import("./googlecalendar"),
  googlevideo: () => import("./googlevideo"),
  hubspot: () => import("./hubspot"),
  huddle01video: () => import("./huddle01video"),
  "ics-feedcalendar": () => import("./ics-feedcalendar"),
  jellyconferencing: () => import("./jelly"),
  jitsivideo: () => import("./jitsivideo"),
  larkcalendar: () => import("./larkcalendar"),
  office365calendar: () => import("./office365calendar"),
  office365video: () => import("./office365video"),
  plausible: () => import("./plausible"),
  paypal: () => import("./paypal"),
  "pipedrive-crm": () => import("./pipedrive-crm"),
  salesforce: () => import("./salesforce"),
  zohocrm: () => import("./zohocrm"),
  sendgrid: () => import("./sendgrid"),
  stripepayment: () => import("./stripepayment"),
  tandemvideo: () => import("./tandemvideo"),
  vital: () => import("./vital"),
  zoomvideo: () => import("./zoomvideo"),
  wipemycalother: () => import("./wipemycalother"),
  webexvideo: () => import("./webex"),
  giphy: () => import("./giphy"),
  zapier: () => import("./zapier"),
  make: () => import("./make"),
  exchange2013calendar: () => import("./exchange2013calendar"),
  exchange2016calendar: () => import("./exchange2016calendar"),
  exchangecalendar: () => import("./exchangecalendar"),
  facetime: () => import("./facetime"),
  sylapsvideo: () => import("./sylapsvideo"),
  zohocalendar: () => import("./zohocalendar"),
  "zoho-bigin": () => import("./zoho-bigin"),
  basecamp3: () => import("./basecamp3"),
  telegramvideo: () => import("./telegram"),
  shimmervideo: () => import("./shimmervideo"),
};

const exportedAppStore: typeof appStore & {
  ["mock-payment-app"]?: () => Promise<typeof import("./mock-payment-app/index")>;
} = appStore;

if (process.env.MOCK_PAYMENT_APP_ENABLED !== undefined) {
  exportedAppStore["mock-payment-app"] = () => import("./mock-payment-app/index");
}

export default exportedAppStore;
