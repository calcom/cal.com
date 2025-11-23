/**
 * Maps conferencing app types or appIds to their icon URLs.
 * Icons are publicly accessible at: https://app.cal.com/app-store/{dirName}/icon.svg
 */

const APP_TYPE_TO_DIR_NAME: Record<string, string> = {
  // Video conferencing apps
  zoom_video: "zoomvideo",
  google_video: "googlevideo",
  office365_video: "office365video",
  teams_video: "office365video",
  daily_video: "dailyvideo",
  jitsi_video: "jitsivideo",
  huddle01_video: "huddle01video",
  tandem_video: "tandemvideo",
  whereby_video: "whereby",
  webex_video: "webex",
  sylapsvideo_video: "sylapsvideo",
  shimmervideo_video: "shimmervideo",
  riverside_video: "riverside",
  roam_video: "roam",
  ping_video: "ping",
  mirotalk_video: "mirotalk",
  nextcloudtalk_conferencing: "nextcloudtalk",
  jelly_conferencing: "jelly",
  "horizon-workrooms_video": "horizon-workrooms",
  "element-call_conferencing": "element-call",
  eightxeight_video: "eightxeight",
  discord_video: "discord",
  dialpad_video: "dialpad",
  demodesk_video: "demodesk",
  campfire_video: "campfire",
  facetime_video: "facetime",
  whatsapp_video: "whatsapp",
  telegram_video: "telegram",
  skype_video: "skype",
  signal_video: "signal",
  sirius_video: "sirius_video",
  sirius_video_video: "sirius_video", // Handle double _video suffix
  salesroom_video: "salesroom",
};

const APP_ID_TO_DIR_NAME: Record<string, string> = {
  zoom: "zoomvideo",
  "google-meet": "googlevideo",
  msteams: "office365video",
  office365: "office365video",
  teams: "office365video",
  "cal-video": "dailyvideo",
  "daily-video": "dailyvideo",
  daily: "dailyvideo",
  jitsi: "jitsivideo",
  huddle01: "huddle01video",
  tandem: "tandemvideo",
  whereby: "whereby",
  webex: "webex",
  sylapsvideo: "sylapsvideo",
  shimmervideo: "shimmervideo",
  riverside: "riverside",
  roam: "roam",
  ping: "ping",
  mirotalk: "mirotalk",
  nextcloudtalk: "nextcloudtalk",
  jelly: "jelly",
  "horizon-workrooms": "horizon-workrooms",
  "element-call": "element-call",
  eightxeight: "eightxeight",
  discord: "discord",
  dialpad: "dialpad",
  demodesk: "demodesk",
  campfire: "campfire",
  facetime: "facetime",
  whatsapp: "whatsapp",
  telegram: "telegram",
  skype: "skype",
  signal: "signal",
  sirius_video: "sirius_video",
  salesroom: "salesroom",
};

/**
 * Generates the icon URL for a conferencing app based on its type or appId.
 * Uses publicly available icons from https://app.cal.com/app-store/{dirName}/icon.svg
 * Special cases are handled (e.g., Google Meet uses logo.webp)
 *
 * @param type - The credential type (e.g., "zoom_video", "google_video")
 * @param appId - The app identifier (e.g., "zoom", "google-meet")
 * @returns The full icon URL or null if the app is not found
 *
 * @example
 * getAppIconUrl("zoom_video", "zoom") // "https://app.cal.com/app-store/zoomvideo/icon.svg"
 * getAppIconUrl("google_video", "google-meet") // "https://app.cal.com/app-store/googlevideo/logo.webp"
 */
export function getAppIconUrl(type: string, appId: string | null): string | null {
  let dirName: string | null = null;
  let iconFileName = "icon.svg";

  // Try to find by appId first (more specific)
  if (appId && APP_ID_TO_DIR_NAME[appId]) {
    dirName = APP_ID_TO_DIR_NAME[appId];
  } else if (APP_TYPE_TO_DIR_NAME[type]) {
    // Fallback to type
    dirName = APP_TYPE_TO_DIR_NAME[type];
  }

  if (!dirName) {
    return null;
  }

  // Special cases for icon file names
  if (appId === "google-meet" || type === "google_video") {
    // Google Meet uses logo.webp instead of icon.svg
    iconFileName = "logo.webp";
  } else if (appId === "riverside" || type === "riverside_video") {
    // Riverside uses icon-dark.svg
    iconFileName = "icon-dark.svg";
  } else if (appId === "sirius_video" || type === "sirius_video" || type === "sirius_video_video") {
    // Sirius Video uses icon-dark.svg
    iconFileName = "icon-dark.svg";
  }

  return `https://app.cal.com/app-store/${dirName}/${iconFileName}`;
}
