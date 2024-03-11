const getQueryParam = (paramName: string, defaultParam?: "setup") => {
  if (typeof window !== "undefined") {
    const currentUrl = new URL(window.location.href);
    const searchParams = currentUrl.searchParams;

    const paramater = searchParams.get(paramName);

    return paramater;
  }

  return defaultParam;
};

export default getQueryParam;
