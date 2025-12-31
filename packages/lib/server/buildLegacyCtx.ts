import type { GetServerSidePropsContext, NextApiRequest } from "next";

export type Params = {
  [param: string]: string | string[] | undefined;
};

export type SearchParams = {
  [param: string]: string | string[] | undefined;
};

export type ReadonlyHeaders = Awaited<ReturnType<typeof import("next/headers").headers>>;
export type ReadonlyRequestCookies = Awaited<ReturnType<typeof import("next/headers").cookies>>;

function createProxifiedObject(object: Record<string, string>): Record<string, string> {
  return new Proxy(object, {
    set: (): never => {
      throw new Error("You are trying to modify 'headers' or 'cookies', which is not supported in app dir");
    },
  });
}

function buildLegacyHeaders(headers: ReadonlyHeaders): Record<string, string> {
  const headersObject = Object.fromEntries(headers.entries());

  return createProxifiedObject(headersObject);
}

function buildLegacyCookies(cookies: ReadonlyRequestCookies): Record<string, string> {
  const cookiesObject = cookies.getAll().reduce<Record<string, string>>((acc, { name, value }) => {
    acc[name] = value;
    return acc;
  }, {});

  return createProxifiedObject(cookiesObject);
}

export function decodeParams(params: Params): Params {
  return Object.entries(params).reduce((acc, [key, value]) => {
    if (Array.isArray(value)) {
      acc[key] = value.map((item) => decodeURIComponent(item));
      return acc;
    }

    if (value !== undefined) {
      acc[key] = decodeURIComponent(value);
    } else {
      acc[key] = value;
    }

    return acc;
  }, {} as Params);
}

export function buildLegacyRequest(
  headers: ReadonlyHeaders,
  cookies: ReadonlyRequestCookies
): NextApiRequest {
  return { headers: buildLegacyHeaders(headers), cookies: buildLegacyCookies(cookies) } as NextApiRequest;
}

export function buildLegacyCtx(
  headers: ReadonlyHeaders,
  cookies: ReadonlyRequestCookies,
  params: Params,
  searchParams: SearchParams
): GetServerSidePropsContext {
  return {
    query: { ...searchParams, ...decodeParams(params) },
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
}
