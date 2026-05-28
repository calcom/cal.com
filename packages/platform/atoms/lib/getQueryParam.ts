const getQueryParam = (paramName: string) => {
  if (typeof window !== "undefined") {
    const currentUrl = new URL(window.location.href);
    const searchParams = currentUrl.searchParams;

    const parameter = searchParams.get(paramName);

    return parameter;
  }

  return undefined;
};

export default getQueryParam;
