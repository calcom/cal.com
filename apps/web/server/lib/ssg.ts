import type { GetStaticPropsContext } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import superjson from "superjson";

import { CALCOM_VERSION } from "@calcom/lib/constants";
import prisma, { readonlyPrisma } from "@calcom/prisma";
import { createProxySSGHelpers } from "@calcom/trpc/react/ssg";
import { appRouter } from "@calcom/trpc/server/routers/_app";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { i18n } = require("@calcom/config/next-i18next.config");

/**
 * Initialize static site rendering tRPC helpers.
 * Provides a method to prefetch tRPC-queries in a `getStaticProps`-function.
 * Automatically prefetches i18n based on the passed in `context`-object to prevent i18n-flickering.
 * Make sure to `return { props: { trpcState: ssr.dehydrate() } }` at the end.
 */
export async function ssgInit<TParams extends { locale?: string }>(opts: GetStaticPropsContext<TParams>) {
  const requestedLocale = opts.params?.locale || opts.locale || i18n.defaultLocale;
  const isSupportedLocale = i18n.locales.includes(requestedLocale);
  if (!isSupportedLocale) {
    console.warn(`Requested unsupported locale "${requestedLocale}"`);
  }
  const locale = isSupportedLocale ? requestedLocale : i18n.defaultLocale;

  const _i18n = await serverSideTranslations(locale, ["common"]);

  const ssg = createProxySSGHelpers({
    router: appRouter,
    transformer: superjson,
    ctx: {
      prisma,
      insightsDb: readonlyPrisma,
      session: null,
      locale,
      i18n: _i18n,
    },
  });

  // i18n translations are already retrieved from serverSideTranslations call, there is no need to run a i18n.fetch
  // we can set query data directly to the queryClient
  const queryKey = [
    ["viewer", "public", "i18n"],
    { input: { locale, CalComVersion: CALCOM_VERSION }, type: "query" },
  ];

  ssg.queryClient.setQueryData(queryKey, { i18n: _i18n });

  return ssg;
}
