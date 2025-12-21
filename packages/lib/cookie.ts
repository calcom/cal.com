export const getCookie = (name: string) => {
  if (typeof document === "undefined") {
    return null;
  }
  return document.cookie
    .split(";")
    .find((cookie) => cookie.trim().startsWith(`${name}=`))
    ?.split("=")[1];
};

export const setCookie = (name: string, value: string, options: string) => {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${name}=${value}; ${options}`;
};
