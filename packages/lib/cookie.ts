export const getCookie = (name: string) => {
  if (typeof document === "undefined") {
    return null;
  }
  return document.cookie
    .split(";")
    .find((cookie) => cookie.trim().startsWith(`${name}=`))
    ?.split("=")[1];
};

export const createCookie = (name: string, value: string) => {
  if (typeof document === "undefined") {
    return null;
  }

  document.cookie = `${name}=${value}; path=/;`;
};

export const deleteCookie = (name: string) => {
  if (typeof document === "undefined") {
    return null;
  }
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};

export const isCookieCreationAllowed = () => {
  createCookie("cookie-allowed", "1");
  const isAllowed = getCookie("cookie-allowed") === "1";
  deleteCookie("cookie-allowed");
  return isAllowed;
};
