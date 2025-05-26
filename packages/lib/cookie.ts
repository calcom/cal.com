export const getCookie = (name: string) => {
  if (typeof document === "undefined") {
    return null;
  }
  return document.cookie
    .split(";")
    .find((cookie) => cookie.trim().startsWith(`${name}=`))
    ?.split("=")[1];
};
