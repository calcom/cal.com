import type { SearchParams } from "app/_types";
import { type Params } from "app/_types";
import type { GetServerSidePropsContext } from "next";
import { type ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";
import { type ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

export const buildLegacyCtx = (
  headers: ReadonlyHeaders,
  cookies: ReadonlyRequestCookies,
  params: Params,
  searchParams: SearchParams
) => {
  return {
    query: { ...searchParams, ...params },
    params,
    req: { headers, cookies },
  } as unknown as GetServerSidePropsContext;
};
