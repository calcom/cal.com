import { GetStaticPropsContext } from "next";
import { i18n } from "next-i18next.config";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import superjson from "superjson";

import prisma from "@lib/prisma";

import { createSSGHelpers } from "@trpc/react/ssg";

import { appRouter } from "./routers/_app";

export async function ssgInit<TParams extends { locale?: string }>(opts: GetStaticPropsContext<TParams>) {
  const requestedLocale = opts.params?.locale || opts.locale || i18n.defaultLocale;
  const isSupportedLocale = i18n.locales.includes(requestedLocale);
  if (!isSupportedLocale) {
    console.warn(`Requested unsupported locale "${requestedLocale}"`);
  }
  const locale = isSupportedLocale ? requestedLocale : i18n.defaultLocale;

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

  // always preload i18n
  await ssg.fetchQuery("viewer.i18n");

  return ssg;
}
