import { type GetServerSidePropsContext } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { headers, cookies } from "next/headers";
import superjson from "superjson";

import { getLocale } from "@calcom/features/auth/lib/getLocale";
import { CALCOM_VERSION } from "@calcom/lib/constants";
import prisma, { readonlyPrisma } from "@calcom/prisma";
import { appRouter } from "@calcom/trpc/server/routers/_app";

import { createTRPCNextLayout } from "./createTRPCNextLayout";

export async function ssrInit(options?: { noI18nPreload: boolean }) {
  const req = {
    headers: headers(),
    cookies: cookies(),
  };

  const locale = await getLocale(req);

  const i18n = (await serverSideTranslations(locale, ["common", "vital"])) || "en";

  const ssr = createTRPCNextLayout({
    router: appRouter,
    transformer: superjson,
    createContext() {
      return {
        prisma,
        insightsDb: readonlyPrisma,
        session: null,
        locale,
        i18n,
        req: req as unknown as GetServerSidePropsContext["req"],
      };
    },
  });

  // i18n translations are already retrieved from serverSideTranslations call, there is no need to run a i18n.fetch
  // we can set query data directly to the queryClient
  const queryKey = [
    ["viewer", "public", "i18n"],
    { input: { locale, CalComVersion: CALCOM_VERSION }, type: "query" },
  ];
  if (!options?.noI18nPreload) {
    ssr.queryClient.setQueryData(queryKey, { i18n });
  }

  await Promise.allSettled([
    // So feature flags are available on first render
    ssr.viewer.features.map.prefetch(),
    // Provides a better UX to the users who have already upgraded.
    ssr.viewer.teams.hasTeamPlan.prefetch(),
    ssr.viewer.public.session.prefetch(),
  ]);

  return ssr;
}
