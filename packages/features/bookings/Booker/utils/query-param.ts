export const updateQueryParam = (param: string, value: string | number) => {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  if (url.searchParams.get(param) === value) return;

  if (value === "" || value === "null") {
    removeQueryParam(param);
    return;
  } else {
    url.searchParams.set(param, `${value}`);
  }
  if (param == "slot") {
    window.history.pushState({ ...window.history.state, as: url.href }, "", url.href);
  } else {
    window.history.replaceState({ ...window.history.state, as: url.href }, "", url.href);
  }
};

export const getQueryParam = (param: string) => {
  if (typeof window === "undefined") return;

  return new URLSearchParams(window.location.search).get(param);
};

export const removeQueryParam = (param: string) => {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  if (!url.searchParams.get(param)) return;

  url.searchParams.delete(param);
  if (param == "slot") {
    window.history.pushState({ ...window.history.state, as: url.href }, "", url.href);
  } else {
    window.history.replaceState({ ...window.history.state, as: url.href }, "", url.href);
  }
};
