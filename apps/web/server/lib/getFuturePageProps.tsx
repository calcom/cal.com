import { ssrInit as ssrInitFuture } from "app/_trpc/ssrInit";
import type { GetServerSidePropsResult } from "next";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";

import type { LegacyCtx } from "@lib/buildLegacyCtx";

export const getFuturePageProps = async <T,>(
  ctx: LegacyCtx,
  getData: (...args: any[]) => Promise<GetServerSidePropsResult<T>>
): Promise<T> => {
  const ssr = await ssrInitFuture();

  const data = await getData(ctx, () => ssr.dehydrate(), "dehydratedState");

  if ("redirect" in data) {
    redirect(data.redirect.destination);
  }

  if ("notFound" in data) {
    notFound();
  }

  return data.props;
};
