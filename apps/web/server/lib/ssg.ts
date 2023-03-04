import type { GetStaticPropsContext } from "next";
import { i18n } from "next-i18next.config";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import superjson from "superjson";

import prisma from "@calcom/prisma";
import { createProxySSGHelpers } from "@calcom/trpc/react/ssg";
import { appRouter } from "@calcom/trpc/server/routers/_app";

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
    // @ts-expect-error FIXME The signature expects req and res. Which we don't have in an SSG context.
    ctx: {
      prisma,
      session: null,
      user: null,
      locale,
      i18n: _i18n,
    },
  });

  // always preload i18n
  await ssg.viewer.public.i18n.fetch();

  return ssg;
}
