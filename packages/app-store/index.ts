const appStore = {
  closecom: createCachedImport(() => import("./closecom")),
  hubspot: createCachedImport(() => import("./hubspot")),
  nextcloudtalkvideo: createCachedImport(() => import("./nextcloudtalk")),
  "pipedrive-crm": createCachedImport(() => import("./pipedrive-crm")),
  salesforce: createCachedImport(() => import("./salesforce")),
  zohocrm: createCachedImport(() => import("./zohocrm")),
  sendgrid: createCachedImport(() => import("./sendgrid")),
  vital: createCachedImport(() => import("./vital")),
  wipemycalother: createCachedImport(() => import("./wipemycalother")),
  giphy: createCachedImport(() => import("./giphy")),
  zapier: createCachedImport(() => import("./zapier")),
  make: createCachedImport(() => import("./make")),
  facetime: createCachedImport(() => import("./facetime")),
  "zoho-bigin": createCachedImport(() => import("./zoho-bigin")),
  basecamp3: createCachedImport(() => import("./basecamp3")),
  telegramvideo: createCachedImport(() => import("./telegram")),
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

const exportedAppStore: typeof appStore = appStore;

export default exportedAppStore;
