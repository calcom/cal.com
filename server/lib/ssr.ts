import { GetServerSidePropsContext } from "next";
import superjson from "superjson";

import { createContext } from "@server/createContext";
import { createSSGHelpers } from "@trpc/react/ssg";

import { appRouter } from "../routers/_app";

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
