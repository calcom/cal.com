import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import superjson from "superjson";

import prisma from "@lib/prisma";

import { createSSGHelpers } from "@trpc/react/ssg";

import { appRouter } from "./routers/_app";

export async function ssgInit(opts: { locale: string }) {
  const { locale } = opts;
  const _i18n = await serverSideTranslations(locale, ["common"]);

  const ssg = createSSGHelpers({
    router: appRouter,
    transformer: superjson,
    ctx: {
      prisma,
      session: null,
      user: null,
      locale,
      i18n: _i18n,
    },
  });

  // always preload "viewer.i18n"
  await ssg.fetchQuery("viewer.i18n");

  return ssg;
}
