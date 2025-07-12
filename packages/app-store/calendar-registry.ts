function createCachedImport<T>(importFunc: () => Promise<T>): () => Promise<T> {
  let cachedModule: T | undefined;
  let isLoading = false;
  let loadingPromise: Promise<T> | undefined;

  return async () => {
    if (cachedModule) return cachedModule;
    if (isLoading && loadingPromise) return loadingPromise;

    isLoading = true;
    loadingPromise = importFunc().then((module) => {
      cachedModule = module;
      isLoading = false;
      return module;
    });

    return loadingPromise;
  };
}

const calendarStore = {
  applecalendar: createCachedImport(() => import("./applecalendar")),
  caldavcalendar: createCachedImport(() => import("./caldavcalendar")),
  googlecalendar: createCachedImport(() => import("./googlecalendar")),
  "ics-feedcalendar": createCachedImport(() => import("./ics-feedcalendar")),
  larkcalendar: createCachedImport(() => import("./larkcalendar")),
  office365calendar: createCachedImport(() => import("./office365calendar")),
  exchange2013calendar: createCachedImport(() => import("./exchange2013calendar")),
  exchange2016calendar: createCachedImport(() => import("./exchange2016calendar")),
  exchangecalendar: createCachedImport(() => import("./exchangecalendar")),
  zohocalendar: createCachedImport(() => import("./zohocalendar")),
};

export default calendarStore;
