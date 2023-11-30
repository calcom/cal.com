import { type ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";
import { type ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

// returns query object same as ctx.query but for app dir
export const getQuery = (url: string, params: Record<string, string | string[]>) => {
  if (!url.length) {
    return params;
  }

  const { searchParams } = new URL(url);
  const searchParamsObj = Object.fromEntries(searchParams.entries());

  return { ...searchParamsObj, ...params };
};

export const buildLegacyCtx = (
  headers: ReadonlyHeaders,
  cookies: ReadonlyRequestCookies,
  params: Record<string, string | string[]>
) => {
  return {
    query: getQuery(headers.get("x-url") ?? "", params),
    params,
    req: { headers, cookies },
  };
};
