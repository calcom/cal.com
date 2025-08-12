import type { NextApiRequest } from "next";
import { type ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";
import { type ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

export type SearchParams = Record<string, string | string[] | undefined>;
export type Params = Record<string, string | string[] | undefined>;

export interface NextJsLegacyContext {
  query: Record<string, string | string[] | undefined>;
  params: Params;
  req: NextApiRequest;
  res: any;
}

const createProxifiedObject = (object: Record<string, string>) =>
  new Proxy(object, {
    set: () => {
      throw new Error("You are trying to modify 'headers' or 'cookies', which is not supported in app dir");
    },
  });

const buildLegacyHeaders = (headers: ReadonlyHeaders) => {
  const headersObject = Object.fromEntries(headers.entries());

  return createProxifiedObject(headersObject);
};

const buildLegacyCookies = (cookies: ReadonlyRequestCookies) => {
  const cookiesObject = cookies.getAll().reduce<Record<string, string>>((acc, { name, value }) => {
    acc[name] = value;
    return acc;
  }, {});

  return createProxifiedObject(cookiesObject);
};

export function decodeParams(params: Params): Params {
  return Object.entries(params).reduce((acc, [key, value]) => {
    // Handle array values
    if (Array.isArray(value)) {
      acc[key] = value.map((item) => decodeURIComponent(item));
      return acc;
    }

    // Handle single values
    if (value !== undefined && value !== null) {
      acc[key] = decodeURIComponent(value);
    } else {
      acc[key] = value;
    }

    return acc;
  }, {} as Params);
}

export const buildLegacyRequest = (
  headers: ReadonlyHeaders,
  cookies: ReadonlyRequestCookies
): NextApiRequest => {
  return { headers: buildLegacyHeaders(headers), cookies: buildLegacyCookies(cookies) } as NextApiRequest;
};

export const buildLegacyCtx = (
  headers: ReadonlyHeaders,
  cookies: ReadonlyRequestCookies,
  params: Params,
  searchParams: SearchParams
): NextJsLegacyContext => {
  return {
    query: { ...searchParams, ...decodeParams(params) },
    // decoding is required to be backward compatible with Pages Router
    // because Next.js App Router does not auto-decode query params while Pages Router does
    // e.g., params: { name: "John%20Doe" } => params: { name: "John Doe" }
    params: decodeParams(params),
    req: { headers: buildLegacyHeaders(headers), cookies: buildLegacyCookies(cookies) } as NextApiRequest,
    res: new Proxy(Object.create(null), {
      // const { req, res } = ctx - valid
      // res.anything - throw
      get() {
        throw new Error(
          "You are trying to access the 'res' property of the context, which is not supported in app dir"
        );
      },
    }),
  };
};
