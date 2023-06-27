import Router from "next/router";

export const updateQueryParam = (param: string, value: string | number) => {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.searchParams.set(param, `${value}`);

  return Router.push(url, url, { shallow: true });
};

export const replaceQueryParams = (param: string, value: string | number) => {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.searchParams.set(param, `${value}`);

  return Router.replace(url, url, { shallow: true });
};

export const getQueryParam = (param: string) => {
  if (typeof window === "undefined") return;

  return new URLSearchParams(window.location.search).get(param);
};

export const removeQueryParam = (param: string) => {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.searchParams.delete(param);
  Router.push(url, url, { shallow: true });
};
