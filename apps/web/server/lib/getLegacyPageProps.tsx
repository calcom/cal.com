import type { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { RequestCookies } from "next/dist/compiled/@edge-runtime/cookies";
import { HeadersAdapter } from "next/dist/server/web/spec-extension/adapters/headers";
import { RequestCookiesAdapter } from "next/dist/server/web/spec-extension/adapters/request-cookies";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { ssrInit } from "@server/lib/ssr";

export const getLegacyPageProps = async <T,>(
  ctx: GetServerSidePropsContext,
  getData: (...args: any[]) => Promise<GetServerSidePropsResult<T>>
): Promise<GetServerSidePropsResult<T>> => {
  const headers = HeadersAdapter.from(ctx.req.headers);
  const requestCookies = new RequestCookies(headers);
  const readonlyRequestCookies = RequestCookiesAdapter.seal(requestCookies);

  const legacyContext = buildLegacyCtx(headers, readonlyRequestCookies, ctx.params ?? {});

  const ssr = await ssrInit(ctx);

  return getData(legacyContext, async () => ssr.dehydrate(), "trpcState");
};
