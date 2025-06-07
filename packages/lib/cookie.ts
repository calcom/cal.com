export const getCookie = (name: string) => {
  if (typeof document === "undefined") {
    return null;
  }
  return document.cookie
    .split(";")
    .find((cookie) => cookie.trim().startsWith(`${name}=`))
    ?.split("=")[1];
};

export const canUseCookies = (): boolean => {
  if (typeof document === "undefined") {
    return false;
  }

  try {
    const testCookieName = "cal-cookie-test";
    const testValue = "test";
    const useSecureCookies = window.location.protocol === "https:";

    const cookieString = `${testCookieName}=${testValue}; path=/; ${
      useSecureCookies ? "sameSite=none; secure" : "sameSite=lax"
    }`;

    document.cookie = cookieString;

    const canRead = document.cookie
      .split(";")
      .some((cookie) => cookie.trim().startsWith(`${testCookieName}=`));

    document.cookie = `${testCookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; ${
      useSecureCookies ? "sameSite=none; secure" : "sameSite=lax"
    }`;

    return canRead;
  } catch (error) {
    return false;
  }
};
