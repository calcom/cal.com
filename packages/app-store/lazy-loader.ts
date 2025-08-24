/**
 * Lazy App Store Loader
 *
 * This module provides a lazy loading mechanism for Cal.com apps to improve
 * development performance by avoiding loading the entire app store upfront.
 *
 * Instead of importing all apps at once, apps are loaded on-demand when
 * actually needed, reducing initial bundle size and compilation time.
 */

type AppImportFunction<T = any> = () => Promise<T>;

// Cache for loaded apps to avoid repeated imports
const appCache = new Map<string, Promise<any>>();

/**
 * App directory mapping - maps app names to their import functions
 * This replaces the monolithic app store object
 */
const APP_IMPORT_MAP: Record<string, AppImportFunction> = {
  alby: () => import("./alby"),
  amie: () => import("./amie"),
  applecalendar: () => import("./applecalendar"),
  attio: () => import("./attio"),
  autocheckin: () => import("./autocheckin"),
  "baa-for-hipaa": () => import("./baa-for-hipaa"),
  basecamp3: () => import("./basecamp3"),
  bolna: () => import("./bolna"),
  btcpayserver: () => import("./btcpayserver"),
  caldavcalendar: () => import("./caldavcalendar"),
  campfire: () => import("./campfire"),
  chatbase: () => import("./chatbase"),
  clic: () => import("./clic"),
  closecom: () => import("./closecom"),
  cron: () => import("./cron"),
  dailyvideo: () => import("./dailyvideo"),
  deel: () => import("./deel"),
  demodesk: () => import("./demodesk"),
  dialpad: () => import("./dialpad"),
  discord: () => import("./discord"),
  dub: () => import("./dub"),
  eightxeight: () => import("./eightxeight"),
  "element-call": () => import("./element-call"),
  elevenlabs: () => import("./elevenlabs"),
  exchange2013calendar: () => import("./exchange2013calendar"),
  exchange2016calendar: () => import("./exchange2016calendar"),
  exchangecalendar: () => import("./exchangecalendar"),
  facetime: () => import("./facetime"),
  fathom: () => import("./fathom"),
  feishucalendar: () => import("./feishucalendar"),
  ga4: () => import("./ga4"),
  giphy: () => import("./giphy"),
  googlecalendar: () => import("./googlecalendar"),
  googlevideo: () => import("./googlevideo"),
  granola: () => import("./granola"),
  "greetmate-ai": () => import("./greetmate-ai"),
  gtm: () => import("./gtm"),
  hitpay: () => import("./hitpay"),
  "horizon-workrooms": () => import("./horizon-workrooms"),
  hubspot: () => import("./hubspot"),
  huddle01video: () => import("./huddle01video"),
  "ics-feedcalendar": () => import("./ics-feedcalendar"),
  insights: () => import("./insights"),
  intercom: () => import("./intercom"),
  jellyconferencing: () => import("./jelly"),
  jitsivideo: () => import("./jitsivideo"),
  larkcalendar: () => import("./larkcalendar"),
  lindy: () => import("./lindy"),
  linear: () => import("./linear"),
  make: () => import("./make"),
  matomo: () => import("./matomo"),
  metapixel: () => import("./metapixel"),
  "millis-ai": () => import("./millis-ai"),
  mirotalk: () => import("./mirotalk"),
  monobot: () => import("./monobot"),
  n8n: () => import("./n8n"),
  nextcloudtalkvideo: () => import("./nextcloudtalk"),
  office365calendar: () => import("./office365calendar"),
  office365video: () => import("./office365video"),
  paypal: () => import("./paypal"),
  ping: () => import("./ping"),
  pipedream: () => import("./pipedream"),
  "pipedrive-crm": () => import("./pipedrive-crm"),
  plausible: () => import("./plausible"),
  posthog: () => import("./posthog"),
  qr_code: () => import("./qr_code"),
  raycast: () => import("./raycast"),
  "retell-ai": () => import("./retell-ai"),
  riverside: () => import("./riverside"),
  roam: () => import("./roam"),
  "routing-forms": () => import("./routing-forms"),
  salesforce: () => import("./salesforce"),
  salesroom: () => import("./salesroom"),
  sendgrid: () => import("./sendgrid"),
  shimmervideo: () => import("./shimmervideo"),
  signal: () => import("./signal"),
  sirius_video: () => import("./sirius_video"),
  skype: () => import("./skype"),
  stripepayment: () => import("./stripepayment"),
  sylapsvideo: () => import("./sylapsvideo"),
  synthflow: () => import("./synthflow"),
  tandemvideo: () => import("./tandemvideo"),
  telegramvideo: () => import("./telegram"),
  telli: () => import("./telli"),
  twipla: () => import("./twipla"),
  umami: () => import("./umami"),
  vimcal: () => import("./vimcal"),
  vital: () => import("./vital"),
  weather_in_your_calendar: () => import("./weather_in_your_calendar"),
  webexvideo: () => import("./webex"),
  whatsapp: () => import("./whatsapp"),
  whereby: () => import("./whereby"),
  wipemycalother: () => import("./wipemycalother"),
  wordpress: () => import("./wordpress"),
  zapier: () => import("./zapier"),
  "zoho-bigin": () => import("./zoho-bigin"),
  zohocalendar: () => import("./zohocalendar"),
  zohocrm: () => import("./zohocrm"),
  zoomvideo: () => import("./zoomvideo"),
};

/**
 * Loads an app by name with caching
 * @param appName - The name of the app to load
 * @returns Promise that resolves to the app module
 */
export async function loadApp<T = any>(appName: string): Promise<T | null> {
  // Check cache first
  if (appCache.has(appName)) {
    return appCache.get(appName)!;
  }

  // Check if app exists in our mapping
  const importFn = APP_IMPORT_MAP[appName];
  if (!importFn) {
    console.warn(`App "${appName}" not found in app store`);
    return null;
  }

  // Load and cache the app
  const appPromise = importFn();
  appCache.set(appName, appPromise);

  try {
    return await appPromise;
  } catch (error) {
    // Remove from cache if loading failed
    appCache.delete(appName);
    console.error(`Failed to load app "${appName}":`, error);
    return null;
  }
}

/**
 * Checks if an app exists without loading it
 * @param appName - The name of the app to check
 * @returns boolean indicating if the app exists
 */
export function hasApp(appName: string): boolean {
  return appName in APP_IMPORT_MAP;
}

/**
 * Gets all available app names
 * @returns Array of app names
 */
export function getAvailableApps(): string[] {
  return Object.keys(APP_IMPORT_MAP);
}

/**
 * Preloads multiple apps (useful for critical apps)
 * @param appNames - Array of app names to preload
 * @returns Promise that resolves when all apps are loaded
 */
export async function preloadApps(appNames: string[]): Promise<void> {
  const loadPromises = appNames.filter(hasApp).map((appName) => loadApp(appName));

  await Promise.allSettled(loadPromises);
}

/**
 * Clears the app cache (useful for testing)
 */
export function clearAppCache(): void {
  appCache.clear();
}

/**
 * Backward compatibility layer - mimics the old app store interface
 * This allows existing code to work without changes while using lazy loading
 */
export const lazyAppStore = new Proxy({} as Record<string, AppImportFunction>, {
  get(target, prop: string) {
    if (typeof prop !== "string") {
      return undefined;
    }

    // Return a function that loads the app when called
    return () => loadApp(prop);
  },

  has(target, prop: string) {
    return hasApp(prop);
  },

  ownKeys(target) {
    return getAvailableApps();
  },

  getOwnPropertyDescriptor(target, prop: string) {
    if (hasApp(prop)) {
      return {
        enumerable: true,
        configurable: true,
        value: () => loadApp(prop),
      };
    }
    return undefined;
  },
});

// Handle mock payment app for development
if (process.env.MOCK_PAYMENT_APP_ENABLED !== undefined) {
  (APP_IMPORT_MAP as any)["mock-payment-app"] = () => import("./mock-payment-app/index");
}

export default lazyAppStore;
