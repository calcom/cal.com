import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { headers } from "next/headers";
import superjson from "superjson";

import { CALCOM_VERSION } from "@calcom/lib/constants";
import prisma, { readonlyPrisma } from "@calcom/prisma";
import { appRouter } from "@calcom/trpc/server/routers/_app";

import { createTRPCNextLayout } from "./createTRPCNextLayout";

export async function ssgInit() {
  const locale = headers().get("x-locale") ?? "en";

  const i18n = (await serverSideTranslations(locale, ["common"])) || "en";

  const ssg = createTRPCNextLayout({
    router: appRouter,
    transformer: superjson,
    createContext() {
      return { prisma, insightsDb: readonlyPrisma, session: null, locale, i18n };
    },
  });

  // i18n translations are already retrieved from serverSideTranslations call, there is no need to run a i18n.fetch
  // we can set query data directly to the queryClient
  const queryKey = [
    ["viewer", "public", "i18n"],
    { input: { locale, CalComVersion: CALCOM_VERSION }, type: "query" },
  ];

  ssg.queryClient.setQueryData(queryKey, { i18n });

  return ssg;
}
