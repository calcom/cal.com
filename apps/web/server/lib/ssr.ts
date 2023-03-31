import type { GetServerSidePropsContext } from "next";
import superjson from "superjson";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { createProxySSGHelpers } from "@calcom/trpc/react/ssg";
import { createContext } from "@calcom/trpc/server/createContext";
import { viewerRouter } from "@calcom/trpc/server/routers/viewer";

/**
 * Initialize server-side rendering tRPC helpers.
 * Provides a method to prefetch tRPC-queries in a `getServerSideProps`-function.
 * Automatically prefetches i18n based on the passed in `context`-object to prevent i18n-flickering.
 * Make sure to `return { props: { trpcState: ssr.dehydrate() } }` at the end.
 */
export async function ssrInit(context: GetServerSidePropsContext) {
  const { req, res } = context;

  const sessionGetter = () => getServerSession({ req, res });

  const ctx = await createContext(context, sessionGetter);

  const ssr = createProxySSGHelpers({
    router: viewerRouter,
    transformer: superjson,
    ctx,
  });

  // always preload "viewer.public.i18n"
  await ssr.public.i18n.fetch();

  return ssr;
}
