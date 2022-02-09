import { GetServerSidePropsContext } from "next";
import superjson from "superjson";

import { createContext } from "@server/createContext";
import { createSSGHelpers } from "@trpc/react/ssg";

import { appRouter } from "../routers/_app";

/**
 * Initialize server-side rendering tRPC helpers.
 * Provides a method to prefetch tRPC-queries in a `getServerSideProps`-function.
 * Automatically prefetches i18n based on the passed in `context`-object to prevent i18n-flickering.
 * Make sure to `return { props: { trpcState: ssr.dehydrate() } }` at the end.
 */
export async function ssrInit(context: GetServerSidePropsContext) {
  const ctx = await createContext(context);

  const ssr = createSSGHelpers({
    router: appRouter,
    transformer: superjson,
    ctx,
  });

  // always preload "viewer.i18n"
  await ssr.fetchQuery("viewer.i18n");

  return ssr;
}
