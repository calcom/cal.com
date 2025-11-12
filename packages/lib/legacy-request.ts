/**
 * Shared utilities for building legacy request objects compatible with Pages Router API
 * Used by both App Router server components and packages that need Next.js API compatibility
 */

type HeadersLike = { entries(): IterableIterator<[string, string]> };
type CookiesLike = { getAll(): { name: string; value: string }[] };

const createProxifiedObject = (object: Record<string, string>) =>
  new Proxy(object, {
    set: () => {
      throw new Error("You are trying to modify 'headers' or 'cookies', which is not supported in app dir");
    },
  });

const buildLegacyHeaders = (headers: HeadersLike) => {
  const headersObject = Object.fromEntries(headers.entries());
  return createProxifiedObject(headersObject);
};

const buildLegacyCookies = (cookies: CookiesLike) => {
  const cookiesObject = cookies.getAll().reduce<Record<string, string>>((acc, { name, value }) => {
    acc[name] = value;
    return acc;
  }, {});
  return createProxifiedObject(cookiesObject);
};

export const buildLegacyRequest = (headers: HeadersLike, cookies: CookiesLike) => {
  return { headers: buildLegacyHeaders(headers), cookies: buildLegacyCookies(cookies) };
};
