const appStore = {
  alby: createCachedImport(() => import("./alby")),
  applecalendar: createCachedImport(() => import("./applecalendar")),
  caldavcalendar: createCachedImport(() => import("./caldavcalendar")),
  closecom: createCachedImport(() => import("./closecom")),
  dailyvideo: createCachedImport(() => import("./dailyvideo")),
  dub: createCachedImport(() => import("./dub")),
  googlecalendar: createCachedImport(() => import("./googlecalendar")),
  googlevideo: createCachedImport(() => import("./googlevideo")),
  hubspot: createCachedImport(() => import("./hubspot")),
  huddle01video: createCachedImport(() => import("./huddle01video")),
  "ics-feedcalendar": createCachedImport(() => import("./ics-feedcalendar")),
  jellyconferencing: createCachedImport(() => import("./jelly")),
  jitsivideo: createCachedImport(() => import("./jitsivideo")),
  larkcalendar: createCachedImport(() => import("./larkcalendar")),
  nextcloudtalkvideo: createCachedImport(() => import("./nextcloudtalk")),
  office365calendar: createCachedImport(() => import("./office365calendar")),
  office365video: createCachedImport(() => import("./office365video")),
  plausible: createCachedImport(() => import("./plausible")),
  paypal: createCachedImport(() => import("./paypal")),
  "pipedrive-crm": createCachedImport(() => import("./pipedrive-crm")),
  salesforce: createCachedImport(() => import("./salesforce")),
  zohocrm: createCachedImport(() => import("./zohocrm")),
  sendgrid: createCachedImport(() => import("./sendgrid")),
  stripepayment: createCachedImport(() => import("./stripepayment")),
  tandemvideo: createCachedImport(() => import("./tandemvideo")),
  vital: createCachedImport(() => import("./vital")),
  zoomvideo: createCachedImport(() => import("./zoomvideo")),
  wipemycalother: createCachedImport(() => import("./wipemycalother")),
  webexvideo: createCachedImport(() => import("./webex")),
  giphy: createCachedImport(() => import("./giphy")),
  zapier: createCachedImport(() => import("./zapier")),
  make: createCachedImport(() => import("./make")),
  exchange2013calendar: createCachedImport(() => import("./exchange2013calendar")),
  exchange2016calendar: createCachedImport(() => import("./exchange2016calendar")),
  exchangecalendar: createCachedImport(() => import("./exchangecalendar")),
  facetime: createCachedImport(() => import("./facetime")),
  sylapsvideo: createCachedImport(() => import("./sylapsvideo")),
  zohocalendar: createCachedImport(() => import("./zohocalendar")),
  "zoho-bigin": createCachedImport(() => import("./zoho-bigin")),
  basecamp3: createCachedImport(() => import("./basecamp3")),
  telegramvideo: createCachedImport(() => import("./telegram")),
  shimmervideo: createCachedImport(() => import("./shimmervideo")),
  hitpay: createCachedImport(() => import("./hitpay")),
};

function createCachedImport<T>(importFunc: () => Promise<T>): () => Promise<T> {
  let cachedModule: T | undefined;

  return async () => {
    if (!cachedModule) {
      cachedModule = await importFunc();
    }
    return cachedModule;
  };
}

const exportedAppStore: typeof appStore & {
  ["mock-payment-app"]?: () => Promise<typeof import("./mock-payment-app/index")>;
} = appStore;

if (process.env.MOCK_PAYMENT_APP_ENABLED !== undefined) {
  exportedAppStore["mock-payment-app"] = createCachedImport(() => import("./mock-payment-app/index"));
}

export default exportedAppStore;
