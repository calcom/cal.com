const appStore = {
  alby: createCachedImport(() => import("./alby/lib")),
  applecalendar: createCachedImport(() => import("./applecalendar/lib")),
  caldavcalendar: createCachedImport(() => import("./caldavcalendar/lib")),
  closecom: createCachedImport(() => import("./closecom/lib")),
  dailyvideo: createCachedImport(() => import("./dailyvideo/lib")),
  dub: createCachedImport(() => import("./dub/lib")),
  googlecalendar: createCachedImport(() => import("./googlecalendar/lib")),
  googlevideo: createCachedImport(() => import("./googlevideo")),
  hubspot: createCachedImport(() => import("./hubspot/lib")),
  huddle01video: createCachedImport(() => import("./huddle01video/lib")),
  "ics-feedcalendar": createCachedImport(() => import("./ics-feedcalendar/lib")),
  jellyconferencing: createCachedImport(() => import("./jelly/lib")),
  jitsivideo: createCachedImport(() => import("./jitsivideo/lib")),
  larkcalendar: createCachedImport(() => import("./larkcalendar/lib")),
  nextcloudtalkvideo: createCachedImport(() => import("./nextcloudtalk/lib")),
  office365calendar: createCachedImport(() => import("./office365calendar/lib")),
  office365video: createCachedImport(() => import("./office365video/lib")),
  plausible: createCachedImport(() => import("./plausible")),
  paypal: createCachedImport(() => import("./paypal/lib")),
  "pipedrive-crm": createCachedImport(() => import("./pipedrive-crm/lib")),
  salesforce: createCachedImport(() => import("./salesforce/lib")),
  zohocrm: createCachedImport(() => import("./zohocrm/lib")),
  sendgrid: createCachedImport(() => import("./sendgrid/lib")),
  stripepayment: createCachedImport(() => import("./stripepayment/lib")),
  tandemvideo: createCachedImport(() => import("./tandemvideo/lib")),
  vital: createCachedImport(() => import("./vital/lib")),
  zoomvideo: createCachedImport(() => import("./zoomvideo/lib")),
  wipemycalother: createCachedImport(() => import("./wipemycalother/lib")),
  webexvideo: createCachedImport(() => import("./webex/lib")),
  giphy: createCachedImport(() => import("./giphy/lib")),
  zapier: createCachedImport(() => import("./zapier")),
  make: createCachedImport(() => import("./make")),
  exchange2013calendar: createCachedImport(() => import("./exchange2013calendar/lib")),
  exchange2016calendar: createCachedImport(() => import("./exchange2016calendar/lib")),
  exchangecalendar: createCachedImport(() => import("./exchangecalendar/lib")),
  facetime: createCachedImport(() => import("./facetime")),
  sylapsvideo: createCachedImport(() => import("./sylapsvideo/lib")),
  zohocalendar: createCachedImport(() => import("./zohocalendar/lib")),
  "zoho-bigin": createCachedImport(() => import("./zoho-bigin/lib")),
  basecamp3: createCachedImport(() => import("./basecamp3/lib")),
  telegramvideo: createCachedImport(() => import("./telegram")),
  shimmervideo: createCachedImport(() => import("./shimmervideo/lib")),
  hitpay: createCachedImport(() => import("./hitpay/lib")),
  btcpayserver: createCachedImport(() => import("./btcpayserver/lib")),
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
