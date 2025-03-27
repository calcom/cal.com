import type { SearchParams } from "app/_types";
import { type Params } from "app/_types";
import type { GetServerSidePropsContext, NextApiRequest } from "next";
import { type ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";
import { type ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

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
    if (value !== undefined) {
      acc[key] = decodeURIComponent(value);
    } else {
      acc[key] = value;
    }

    return acc;
  }, {} as Params);
}

export const buildLegacyRequest = async (
  headers: ReadonlyHeaders | Promise<ReadonlyHeaders>,
  cookies: ReadonlyRequestCookies | Promise<ReadonlyRequestCookies>
) => {
  return {
    headers: buildLegacyHeaders(await headers),
    cookies: buildLegacyCookies(await cookies),
  } as NextApiRequest;
};

export const buildLegacyCtx = async (
  headers: ReadonlyHeaders | Promise<ReadonlyHeaders>,
  cookies: ReadonlyRequestCookies | Promise<ReadonlyRequestCookies>,
  params: Params | Promise<Params>,
  searchParams: SearchParams | Promise<SearchParams>
) => {
  return {
    query: { ...(await searchParams), ...decodeParams(await params) },
    // decoding is required to be backward compatible with Pages Router
    // because Next.js App Router does not auto-decode query params while Pages Router does
    // e.g., params: { name: "John%20Doe" } => params: { name: "John Doe" }
    params: decodeParams(await params),
    req: { headers: buildLegacyHeaders(await headers), cookies: buildLegacyCookies(await cookies) },
    res: new Proxy(Object.create(null), {
      // const { req, res } = ctx - valid
      // res.anything - throw
      get() {
        throw new Error(
          "You are trying to access the 'res' property of the context, which is not supported in app dir"
        );
      },
    }),
  } as unknown as GetServerSidePropsContext;
};
