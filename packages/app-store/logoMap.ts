/**
 * Dynamic logo imports to avoid loading all logos at startup
 * This provides better performance than static imports in metadata files
 */

export const logoMap = {
  alby: () => import("./alby/static/icon.svg"),
  amie: () => import("./amie/static/icon.svg"),
  applecalendar: () => import("./applecalendar/static/icon.svg"),
  attio: () => import("./attio/static/icon.svg"),
  autocheckin: () => import("./autocheckin/static/icon.svg"),
  "baa-for-hipaa": () => import("./baa-for-hipaa/static/icon.svg"),
  basecamp3: () => import("./basecamp3/static/icon.svg"),
  bolna: () => import("./bolna/static/icon-primary.svg"),
  btcpayserver: () => import("./btcpayserver/static/icon.svg"),
  caldavcalendar: () => import("./caldavcalendar/static/icon.svg"),
  campfire: () => import("./campfire/static/icon.svg"),
  chatbase: () => import("./chatbase/static/icon.svg"),
  clic: () => import("./clic/static/icon.svg"),
  closecom: () => import("./closecom/static/icon.svg"),
  cron: () => import("./cron/static/icon.svg"),
  dailyvideo: () => import("./dailyvideo/static/icon.svg"),
  deel: () => import("./deel/static/icon.svg"),
  demodesk: () => import("./demodesk/static/icon.svg"),
  dialpad: () => import("./dialpad/static/icon.svg"),
  discord: () => import("./discord/static/icon.svg"),
  dub: () => import("./dub/static/icon.svg"),
  eightxeight: () => import("./eightxeight/static/icon.svg"),
  "element-call": () => import("./element-call/static/icon.svg"),
  elevenlabs: () => import("./elevenlabs/static/icon.svg"),
  exchangecalendar: () => import("./exchangecalendar/static/icon.svg"),
  facetime: () => import("./facetime/static/icon.svg"),
  fathom: () => import("./fathom/static/icon.svg"),
  feishucalendar: () => import("./feishucalendar/static/icon.svg"),
  ga4: () => import("./ga4/static/icon.svg"),
  giphy: () => import("./giphy/static/icon.svg"),
  googlecalendar: () => import("./googlecalendar/static/icon.svg"),
  googlevideo: () => import("./googlevideo/static/icon.svg"),
  granola: () => import("./granola/static/icon.svg"),
  "greetmate-ai": () => import("./greetmate-ai/static/icon-dark.svg"),
  gtm: () => import("./gtm/static/icon.svg"),
  hitpay: () => import("./hitpay/static/icon.svg"),
  "horizon-workrooms": () => import("./horizon-workrooms/static/icon.svg"),
  hubspot: () => import("./hubspot/static/icon.svg"),
  huddle01video: () => import("./huddle01video/static/icon.svg"),
  "ics-feedcalendar": () => import("./ics-feedcalendar/static/icon.svg"),
  insihts: () => import("./insihts/static/icon.svg"),
  intercom: () => import("./intercom/static/icon.svg"),
  jelly: () => import("./jelly/static/icon.svg"),
  jitsivideo: () => import("./jitsivideo/static/icon.svg"),
  larkcalendar: () => import("./larkcalendar/static/icon.svg"),
  linear: () => import("./linear/static/icon.svg"),
  lindy: () => import("./lindy/static/icon.svg"),
  make: () => import("./make/static/icon.svg"),
  matomo: () => import("./matomo/static/icon.svg"),
  metapixel: () => import("./metapixel/static/icon.svg"),
  "millis-ai": () => import("./millis-ai/static/icon.png"),
  mirotalk: () => import("./mirotalk/static/icon.svg"),
  "mock-payment-app": () => import("./mock-payment-app/static/icon.svg"),
  monobot: () => import("./monobot/static/icon.svg"),
  n8n: () => import("./n8n/static/icon.svg"),
  nextcloudtalk: () => import("./nextcloudtalk/static/icon.svg"),
  office365calendar: () => import("./office365calendar/static/icon.svg"),
  office365video: () => import("./office365video/static/icon.svg"),
  paypal: () => import("./paypal/static/icon.svg"),
  ping: () => import("./ping/static/icon.svg"),
  "pipedrive-crm": () => import("./pipedrive-crm/static/icon.svg"),
  plausible: () => import("./plausible/static/icon.svg"),
  posthog: () => import("./posthog/static/icon.svg"),
  qr_code: () => import("./qr_code/static/icon.svg"),
  "retell-ai": () => import("./retell-ai/static/icon.svg"),
  roam: () => import("./roam/static/icon.png"),
  "routing-forms": () => import("./routing-forms/static/icon-dark.svg"),
  salesforce: () => import("./salesforce/static/icon.svg"),
  salesroom: () => import("./salesroom/static/icon.svg"),
  sendgrid: () => import("./sendgrid/static/icon.svg"),
  shimmervideo: () => import("./shimmervideo/static/icon.png"),
  skype: () => import("./skype/static/icon.svg"),
  stripepayment: () => import("./stripepayment/static/icon.svg"),
  sylapsvideo: () => import("./sylapsvideo/static/icon.svg"),
  synthflow: () => import("./synthflow/static/icon.svg"),
  tandemvideo: () => import("./tandemvideo/static/icon.svg"),
  telegram: () => import("./telegram/static/icon.svg"),
  telli: () => import("./telli/static/icon.svg"),
  twipla: () => import("./twipla/static/icon.svg"),
  umami: () => import("./umami/static/icon.svg"),
  vital: () => import("./vital/static/icon.svg"),
  webex: () => import("./webex/static/icon.svg"),
  wipemycalother: () => import("./wipemycalother/static/icon.svg"),
  zapier: () => import("./zapier/static/icon.svg"),
  "zoho-bigin": () => import("./zoho-bigin/static/icon.svg"),
  zohocalendar: () => import("./zohocalendar/static/icon.svg"),
  zohocrm: () => import("./zohocrm/static/icon.svg"),
  zoomvideo: () => import("./zoomvideo/static/icon.svg"),
} as const;

export type AppName = keyof typeof logoMap;

/**
 * Get logo for an app with lazy loading
 */
export const getAppLogo = async (appName: string): Promise<string> => {
  const logoImport = logoMap[appName as AppName];
  if (!logoImport) {
    console.warn(`No logo found for app: ${appName}`);
    return "";
  }

  try {
    const logo = await logoImport();
    return logo.default || logo;
  } catch (error) {
    console.error(`Failed to load logo for ${appName}:`, error);
    return "";
  }
};

/**
 * Preload logos for specific apps (useful for critical apps)
 */
export const preloadLogos = async (appNames: string[]): Promise<void> => {
  await Promise.all(
    appNames.map((appName) =>
      getAppLogo(appName).catch(() => {
        return;
      })
    )
  );
};
