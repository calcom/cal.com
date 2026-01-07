import type { GetServerSidePropsContext, NextApiRequest } from "next";

// These types are copied from apps/web/app/_types.ts to avoid circular dependency
type Params = {
  [param: string]: string | string[] | undefined;
};

type SearchParams = {
  [param: string]: string | string[] | undefined;
};

type ReadonlyHeaders = Awaited<ReturnType<typeof import("next/headers").headers>>;
type ReadonlyRequestCookies = Awaited<ReturnType<typeof import("next/headers").cookies>>;

const createProxifiedObject = (object: Record<string, string>): Record<string, string> =>
  new Proxy(object, {
    set: (): never => {
      throw new Error("You are trying to modify 'headers' or 'cookies', which is not supported in app dir");
    },
  });

const buildLegacyHeaders = (headers: ReadonlyHeaders): Record<string, string> => {
  const headersObject = Object.fromEntries(headers.entries());

  return createProxifiedObject(headersObject);
};

const buildLegacyCookies = (cookies: ReadonlyRequestCookies): Record<string, string> => {
  const cookiesObject = cookies.getAll().reduce<Record<string, string>>((acc, { name, value }) => {
    acc[name] = value;
    return acc;
  }, {});

  return createProxifiedObject(cookiesObject);
};

function decodeParams(params: Params): Params {
  return Object.entries(params).reduce((acc, [key, value]) => {
    // Handle array values
    if (Array.isArray(value)) {
      acc[key] = value.map((item) => decodeURIComponent(item));
      return acc;
    }

    // Handle single values
    if (value !== undefined) {
      acc[key] = decodeURIComponent(value);
    } else {
      acc[key] = value;
    }

    return acc;
  }, {} as Params);
}

const buildLegacyRequest = (headers: ReadonlyHeaders, cookies: ReadonlyRequestCookies): NextApiRequest => {
  return { headers: buildLegacyHeaders(headers), cookies: buildLegacyCookies(cookies) } as NextApiRequest;
};

const buildLegacyCtx = (
  headers: ReadonlyHeaders,
  cookies: ReadonlyRequestCookies,
  params: Params,
  searchParams: SearchParams
): GetServerSidePropsContext => {
  return {
    query: { ...searchParams, ...decodeParams(params) },
    // decoding is required to be backward compatible with Pages Router
    // because Next.js App Router does not auto-decode query params while Pages Router does
    // e.g., params: { name: "John%20Doe" } => params: { name: "John Doe" }
    params: decodeParams(params),
    req: { headers: buildLegacyHeaders(headers), cookies: buildLegacyCookies(cookies) },
    res: new Proxy(Object.create(null) as GetServerSidePropsContext["res"], {
      get(): never {
        throw new Error(
          "You are trying to access the 'res' property of the context, which is not supported in app dir"
        );
      },
    }),
  } as unknown as GetServerSidePropsContext;
};

export { decodeParams, buildLegacyRequest, buildLegacyCtx };
export type { Params, SearchParams, ReadonlyHeaders, ReadonlyRequestCookies };
