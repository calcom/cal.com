type CookieOptions = {
  Secure?: boolean;
  SameSite?: "Lax" | "Strict" | "None";
};

export const getCookie = (name: string) => {
  if (typeof document === "undefined") {
    return null;
  }
  return document.cookie
    .split(";")
    .find((cookie) => cookie.trim().startsWith(`${name}=`))
    ?.split("=")[1];
};

/**
 * Creates a new cookie with the specified name, value, and options
 * @param name The name of the cookie
 * @param value The value to store in the cookie
 * @param options Configuration options for the cookie
 */
export const createCookie = (name: string, value: string, options: CookieOptions): void => {
  if (typeof window === "undefined") return;

  const cookieOptions = [
    "path=/",
    options.Secure ? "Secure" : "",
    options.SameSite ? `SameSite=${options.SameSite}` : "",
  ]
    .filter(Boolean)
    .join("; ");

  document.cookie = `${name}=${value}; ${cookieOptions}`;
};

export const deleteCookie = (name: string) => {
  if (typeof document === "undefined") {
    return null;
  }
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};
