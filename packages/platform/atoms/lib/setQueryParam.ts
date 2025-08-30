const setQueryParam = (paramName: string, paramValue: string, onParamChange?: () => void) => {
  const currentUrl = new URL(window.location.href);
  const params = new URLSearchParams(currentUrl.search);

  params.set(paramName, paramValue);

  currentUrl.search = params.toString();
  window.history.replaceState({}, "", currentUrl.href);

  !!onParamChange && onParamChange();
};

export default setQueryParam;
