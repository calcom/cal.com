export * as alby from "./alby";
export * as applecalendar from "./applecalendar";
export * as caldavcalendar from "./caldavcalendar";
export * as closecom from "./closecom";
export * as dailyvideo from "./dailyvideo";
export * as dub from "./dub";
export * as googlecalendar from "./googlecalendar";
export * as googlevideo from "./googlevideo";
export * as hubspot from "./hubspot";
export * as huddle01video from "./huddle01video";
export * as icsfeedcalendar from "./ics-feedcalendar";
export * as jellyconferencing from "./jelly";
export * as jitsivideo from "./jitsivideo";
export * as larkcalendar from "./larkcalendar";
export * as nextcloudtalkvideo from "./nextcloudtalk";
export * as office365calendar from "./office365calendar";
export * as office365video from "./office365video";
export * as plausible from "./plausible";
export * as paypal from "./paypal";
export * as pipedrivecrm from "./pipedrive-crm";
export * as salesforce from "./salesforce";
export * as zohocrm from "./zohocrm";
export * as sendgrid from "./sendgrid";
export * as stripepayment from "./stripepayment";
export * as tandemvideo from "./tandemvideo";
export * as vital from "./vital";
export * as zoomvideo from "./zoomvideo";
export * as wipemycalother from "./wipemycalother";
export * as webexvideo from "./webex";
export * as giphy from "./giphy";
export * as zapier from "./zapier";
export * as make from "./make";
export * as exchange2013calendar from "./exchange2013calendar";
export * as exchange2016calendar from "./exchange2016calendar";
export * as exchangecalendar from "./exchangecalendar";
export * as facetime from "./facetime";
export * as sylapsvideo from "./sylapsvideo";
export * as zohocalendar from "./zohocalendar";
export * as zohobigin from "./zoho-bigin";
export * as basecamp3 from "./basecamp3";
export * as telegramvideo from "./telegram";
export * as shimmervideo from "./shimmervideo";
export * as hitpay from "./hitpay";
export * as btcpayserver from "./btcpayserver";

const appStore = {
  alby: () => import("./alby"),
  applecalendar: () => import("./applecalendar"),
  caldavcalendar: () => import("./caldavcalendar"),
  closecom: () => import("./closecom"),
  dailyvideo: () => import("./dailyvideo"),
  dub: () => import("./dub"),
  googlecalendar: () => import("./googlecalendar"),
  googlevideo: () => import("./googlevideo"),
  hubspot: () => import("./hubspot"),
  huddle01video: () => import("./huddle01video"),
  "ics-feedcalendar": () => import("./ics-feedcalendar"),
  jellyconferencing: () => import("./jelly"),
  jitsivideo: () => import("./jitsivideo"),
  larkcalendar: () => import("./larkcalendar"),
  nextcloudtalkvideo: () => import("./nextcloudtalk"),
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
  hitpay: () => import("./hitpay"),
  btcpayserver: () => import("./btcpayserver"),
};

const exportedAppStore: typeof appStore & {
  ["mock-payment-app"]?: () => Promise<typeof import("./mock-payment-app/index")>;
} = appStore;

if (process.env.MOCK_PAYMENT_APP_ENABLED !== undefined) {
  exportedAppStore["mock-payment-app"] = () => import("./mock-payment-app/index");
}

export default exportedAppStore;
