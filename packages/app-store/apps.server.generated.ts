// Statically import all the required modules at the top
import * as albyApi from "./alby/api";
import * as amieApi from "./amie/api";
import * as applecalendarApi from "./applecalendar/api";
import * as aroundApi from "./around/api";
import * as attioApi from "./attio/api";
import * as autocheckinApi from "./autocheckin/api";
import * as baaForHipaaApi from "./baa-for-hipaa/api";
import * as basecamp3Api from "./basecamp3/api";
import * as bolnaApi from "./bolna/api";
import * as caldavcalendarApi from "./caldavcalendar/api";
import * as campfireApi from "./campfire/api";
import * as chatbaseApi from "./chatbase/api";
import * as clicApi from "./clic/api";
import * as closecomApi from "./closecom/api";
import * as cronApi from "./cron/api";
import * as deelApi from "./deel/api";
import * as demodeskApi from "./demodesk/api";
import * as dialpadApi from "./dialpad/api";
import * as discordApi from "./discord/api";
import * as eightxeightApi from "./eightxeight/api";
import * as elementCallApi from "./element-call/api";
import * as elevenlabsApi from "./elevenlabs/api";
import * as exchange2013calendarApi from "./exchange2013calendar/api";
import * as exchange2016calendarApi from "./exchange2016calendar/api";
import * as exchangecalendarApi from "./exchangecalendar/api";
import * as facetimeApi from "./facetime/api";
import * as fathomApi from "./fathom/api";
import * as feishucalendarApi from "./feishucalendar/api";
import * as ga4Api from "./ga4/api";
import * as giphyApi from "./giphy/api";
import * as googlecalendarApi from "./googlecalendar/api";
import * as googlevideoApi from "./googlevideo/api";
import * as granolaApi from "./granola/api";
import * as greetmateApi from "./greetmate-ai/api";
import * as gtmApi from "./gtm/api";
import * as hitpayApi from "./hitpay/api";
import * as horizonWorkroomsApi from "./horizon-workrooms/api";
import * as hubspotApi from "./hubspot/api";
import * as huddle01videoApi from "./huddle01video/api";
import * as icsFeedcalendarApi from "./ics-feedcalendar/api";
import * as insihtsApi from "./insihts/api";
import * as intercomApi from "./intercom/api";
import * as jellyApi from "./jelly/api";
import * as jitsivideoApi from "./jitsivideo/api";
import * as larkcalendarApi from "./larkcalendar/api";
import * as linearApi from "./linear/api";
import * as makeApi from "./make/api";
import * as matomoApi from "./matomo/api";
import * as metapixelApi from "./metapixel/api";
import * as millisAiApi from "./millis-ai/api";
import * as mirotalkApi from "./mirotalk/api";
import * as mockPaymentAppApi from "./mock-payment-app/api";
import * as monobotApi from "./monobot/api";
import * as n8nApi from "./n8n/api";
import * as nextcloudtalkApi from "./nextcloudtalk/api";
import * as office365calendarApi from "./office365calendar/api";
import * as office365videoApi from "./office365video/api";
import * as paypalApi from "./paypal/api";
import * as pingApi from "./ping/api";
import * as pipedreamApi from "./pipedream/api";
import * as pipedriveCrmApi from "./pipedrive-crm/api";
import * as plausibleApi from "./plausible/api";
import * as posthogApi from "./posthog/api";
import * as qrCodeApi from "./qr_code/api";
import * as raycastApi from "./raycast/api";
import * as retellAiApi from "./retell-ai/api";
import * as riversideApi from "./riverside/api";
import * as roamApi from "./roam/api";
import * as routingFormsApi from "./routing-forms/api";
import * as salesforceApi from "./salesforce/api";
import * as salesroomApi from "./salesroom/api";
import * as sendgridApi from "./sendgrid/api";
import * as shimmervideoApi from "./shimmervideo/api";
import * as signalApi from "./signal/api";
import * as siriusVideoApi from "./sirius_video/api";
import * as skypeApi from "./skype/api";
import * as stripepaymentApi from "./stripepayment/api";
import * as sylapsvideoApi from "./sylapsvideo/api";
import * as synthflowApi from "./synthflow/api";
import * as tandemvideoApi from "./tandemvideo/api";
import * as telegramApi from "./telegram/api";
import * as telliApi from "./telli/api";
import * as basicApi from "./templates/basic/api";
import * as bookingPagesTagApi from "./templates/booking-pages-tag/api";
import * as eventTypeAppCardApi from "./templates/event-type-app-card/api";
import * as eventTypeLocationVideoStaticApi from "./templates/event-type-location-video-static/api";
import * as generalAppSettingsApi from "./templates/general-app-settings/api";
import * as linkAsAnAppApi from "./templates/link-as-an-app/api";
import * as twiplaApi from "./twipla/api";
import * as umamiApi from "./umami/api";
import * as vimcalApi from "./vimcal/api";
import * as vitalApi from "./vital/api";
import * as weatherInYourCalendarApi from "./weather_in_your_calendar/api";
import * as webexApi from "./webex/api";
import * as whatsappApi from "./whatsapp/api";
import * as wherebyApi from "./whereby/api";
import * as wipemycalotherApi from "./wipemycalother/api";
import * as wordpressApi from "./wordpress/api";
import * as zapierApi from "./zapier/api";
import * as zohoBiginApi from "./zoho-bigin/api";
import * as zohocalendarApi from "./zohocalendar/api";
import * as zohocrmApi from "./zohocrm/api";
import * as zoomvideoApi from "./zoomvideo/api";

// Create the apiHandlers with static imports
export const apiHandlers = {
  alby: albyApi,
  amie: amieApi,
  applecalendar: applecalendarApi,
  around: aroundApi,
  attio: attioApi,
  autocheckin: autocheckinApi,
  "baa-for-hipaa": baaForHipaaApi,
  basecamp3: basecamp3Api,
  bolna: bolnaApi,
  caldavcalendar: caldavcalendarApi,
  campfire: campfireApi,
  chatbase: chatbaseApi,
  clic: clicApi,
  closecom: closecomApi,
  cron: cronApi,
  deel: deelApi,
  demodesk: demodeskApi,
  dialpad: dialpadApi,
  discord: discordApi,
  eightxeight: eightxeightApi,
  "element-call": elementCallApi,
  elevenlabs: elevenlabsApi,
  exchange2013calendar: exchange2013calendarApi,
  exchange2016calendar: exchange2016calendarApi,
  exchangecalendar: exchangecalendarApi,
  facetime: facetimeApi,
  fathom: fathomApi,
  feishucalendar: feishucalendarApi,
  ga4: ga4Api,
  giphy: giphyApi,
  googlecalendar: googlecalendarApi,
  googlevideo: googlevideoApi,
  granola: granolaApi,
  "greetmate-api": greetmateApi,
  gtm: gtmApi,
  hitpay: hitpayApi,
  "horizon-workrooms": horizonWorkroomsApi,
  hubspot: hubspotApi,
  huddle01video: huddle01videoApi,
  "ics-feedcalendar": icsFeedcalendarApi,
  insihts: insihtsApi,
  intercom: intercomApi,
  jelly: jellyApi,
  jitsivideo: jitsivideoApi,
  larkcalendar: larkcalendarApi,
  linear: linearApi,
  make: makeApi,
  matomo: matomoApi,
  metapixel: metapixelApi,
  "millis-ai": millisAiApi,
  mirotalk: mirotalkApi,
  "mock-payment-app": mockPaymentAppApi,
  monobot: monobotApi,
  n8n: n8nApi,
  nextcloudtalk: nextcloudtalkApi,
  office365calendar: office365calendarApi,
  office365video: office365videoApi,
  paypal: paypalApi,
  ping: pingApi,
  pipedream: pipedreamApi,
  "pipedrive-crm": pipedriveCrmApi,
  plausible: plausibleApi,
  posthog: posthogApi,
  qr_code: qrCodeApi,
  raycast: raycastApi,
  "retell-ai": retellAiApi,
  riverside: riversideApi,
  roam: roamApi,
  "routing-forms": routingFormsApi,
  salesforce: salesforceApi,
  salesroom: salesroomApi,
  sendgrid: sendgridApi,
  shimmervideo: shimmervideoApi,
  signal: signalApi,
  sirius_video: siriusVideoApi,
  skype: skypeApi,
  stripepayment: stripepaymentApi,
  sylapsvideo: sylapsvideoApi,
  synthflow: synthflowApi,
  tandemvideo: tandemvideoApi,
  telegram: telegramApi,
  telli: telliApi,
  basic: basicApi,
  "booking-pages-tag": bookingPagesTagApi,
  "event-type-app-card": eventTypeAppCardApi,
  "event-type-location-video-static": eventTypeLocationVideoStaticApi,
  "general-app-settings": generalAppSettingsApi,
  "link-as-an-app": linkAsAnAppApi,
  twipla: twiplaApi,
  umami: umamiApi,
  vimcal: vimcalApi,
  vital: vitalApi,
  weather_in_your_calendar: weatherInYourCalendarApi,
  webex: webexApi,
  whatsapp: whatsappApi,
  whereby: wherebyApi,
  wipemycalother: wipemycalotherApi,
  wordpress: wordpressApi,
  zapier: zapierApi,
  "zoho-bigin": zohoBiginApi,
  zohocalendar: zohocalendarApi,
  zohocrm: zohocrmApi,
  zoomvideo: zoomvideoApi,
};
