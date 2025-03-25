// Statically import all the modules at the top
import * as alby from "./alby";
import * as applecalendar from "./applecalendar";
import * as aroundvideo from "./around";
import * as basecamp3 from "./basecamp3";
import * as caldavcalendar from "./caldavcalendar";
import * as closecom from "./closecom";
import * as dailyvideo from "./dailyvideo";
import * as exchange2013calendar from "./exchange2013calendar";
import * as exchange2016calendar from "./exchange2016calendar";
import * as exchangecalendar from "./exchangecalendar";
import * as facetime from "./facetime";
import * as giphy from "./giphy";
import * as googlecalendar from "./googlecalendar";
import * as googlevideo from "./googlevideo";
import * as hitpay from "./hitpay";
import * as hubspot from "./hubspot";
import * as huddle01video from "./huddle01video";
import * as icsFeedcalendar from "./ics-feedcalendar";
import * as jellyconferencing from "./jelly";
import * as jitsivideo from "./jitsivideo";
import * as larkcalendar from "./larkcalendar";
import * as make from "./make";
import * as mockPaymentApp from "./mock-payment-app";
import * as nextcloudtalkvideo from "./nextcloudtalk";
import * as office365calendar from "./office365calendar";
import * as office365video from "./office365video";
import * as paypal from "./paypal";
import * as pipedriveCRM from "./pipedrive-crm";
import * as plausible from "./plausible";
import * as salesforce from "./salesforce";
import * as sendgrid from "./sendgrid";
import * as shimmervideo from "./shimmervideo";
import * as stripepayment from "./stripepayment";
import * as sylapsvideo from "./sylapsvideo";
import * as tandemvideo from "./tandemvideo";
import * as telegramvideo from "./telegram";
import * as vital from "./vital";
import * as webexvideo from "./webex";
import * as wipemycalother from "./wipemycalother";
import * as zapier from "./zapier";
import * as zohoBigin from "./zoho-bigin";
import * as zohocalendar from "./zohocalendar";
import * as zohocrm from "./zohocrm";
import * as zoomvideo from "./zoomvideo";

// Create a non-dynamic version of appStore with all static imports
const appStore = {
  alby,
  applecalendar,
  aroundvideo,
  caldavcalendar,
  closecom,
  dailyvideo,
  googlecalendar,
  googlevideo,
  hubspot,
  huddle01video,
  "ics-feedcalendar": icsFeedcalendar,
  jellyconferencing,
  jitsivideo,
  larkcalendar,
  nextcloudtalkvideo,
  office365calendar,
  office365video,
  plausible,
  paypal,
  "pipedrive-crm": pipedriveCRM,
  salesforce,
  zohocrm,
  sendgrid,
  stripepayment,
  tandemvideo,
  vital,
  zoomvideo,
  wipemycalother,
  webexvideo,
  giphy,
  zapier,
  make,
  exchange2013calendar,
  exchange2016calendar,
  exchangecalendar,
  facetime,
  sylapsvideo,
  zohocalendar,
  "zoho-bigin": zohoBigin,
  basecamp3,
  telegramvideo,
  shimmervideo,
  hitpay,
};

const exportedAppStore: typeof appStore & {
  ["mock-payment-app"]?: typeof mockPaymentApp;
} = { ...appStore };

if (process.env.MOCK_PAYMENT_APP_ENABLED !== undefined) {
  exportedAppStore["mock-payment-app"] = mockPaymentApp;
}

export default exportedAppStore;
