import type { GetServerSidePropsContext } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import superjson from "superjson";

import { getLocaleFromHeaders } from "@calcom/lib/i18n";
import { createProxySSGHelpers } from "@calcom/trpc/react/ssg";
import { createContext } from "@calcom/trpc/server/createContext";
import { appRouter } from "@calcom/trpc/server/routers/_app";

/**
 * Initialize server-side rendering tRPC helpers.
 * Provides a method to prefetch tRPC-queries in a `getServerSideProps`-function.
 * Automatically prefetches i18n based on the passed in `context`-object to prevent i18n-flickering.
 * Make sure to `return { props: { trpcState: ssr.dehydrate() } }` at the end.
 */
export async function ssrInit(context: GetServerSidePropsContext) {
  const ctx = await createContext(context);
  const locale = getLocaleFromHeaders(context.req);
  const i18n = await serverSideTranslations(getLocaleFromHeaders(context.req), ["common", "vital"]);

  const ssr = createProxySSGHelpers({
    router: appRouter,
    transformer: superjson,
    ctx: { ...ctx, locale, i18n },
  });

  // always preload "viewer.public.i18n"
  await ssr.viewer.public.i18n.fetch();

  return ssr;
}
