import type { SearchParams } from "app/_types";
import { type Params } from "app/_types";
import type { GetServerSidePropsContext } from "next";
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

export const buildLegacyCtx = (
  headers: ReadonlyHeaders,
  cookies: ReadonlyRequestCookies,
  params: Params,
  searchParams: SearchParams
) => {
  return {
    query: { ...searchParams, ...params },
    params,
    req: { headers: buildLegacyHeaders(headers), cookies: buildLegacyCookies(cookies) },
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
