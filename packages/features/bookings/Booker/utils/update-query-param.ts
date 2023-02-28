export const updateQueryParam = (param: string, value: string | number) => {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.searchParams.set(param, `${value}`);
  window.history.pushState({}, "", url.href);
};
