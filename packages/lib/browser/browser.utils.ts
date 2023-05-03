type BrowserInfo = {
  url: string;
  path: string;
  referrer: string;
  title: string;
  query: string;
  origin: string;
};

export const getBrowserInfo = (): Partial<BrowserInfo> => {
  if (typeof window === "undefined") {
    return {};
  }
  return {
    url: window.document.location?.href ?? undefined,
    path: window.document.location?.pathname ?? undefined,
    referrer: window.document?.referrer ?? undefined,
    title: window.document.title ?? undefined,
    query: window.document.location?.search,
    origin: window.document.location?.origin,
  };
};
