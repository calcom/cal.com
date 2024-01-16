import LegacyPage from "@pages/apps/categories/index";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import type { GetServerSidePropsContext } from "next";

import { getAppRegistry, getAppRegistryWithCredentials } from "@calcom/app-store/_appRegistry";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { APP_NAME } from "@calcom/lib/constants";

import { ssrInit } from "@server/lib/ssr";

export const generateMetadata = async () => {
  return await _generateMetadata(
    () => `Categories | ${APP_NAME}`,
    () => ""
  );
};

const getData = async (ctx: GetServerSidePropsContext) => {
  const ssr = await ssrInit(ctx);

  const session = await getServerSession({ req: ctx.req });

  let appStore;
  if (session?.user?.id) {
    appStore = await getAppRegistryWithCredentials(session.user.id);
  } else {
    appStore = await getAppRegistry();
  }

  const categories = appStore.reduce((c, app) => {
    for (const category of app.categories) {
      c[category] = c[category] ? c[category] + 1 : 1;
    }
    return c;
  }, {} as Record<string, number>);

  return {
    categories: Object.entries(categories).map(([name, count]) => ({ name, count })),
    dehydratedState: ssr.dehydrate(),
  };
};

export default WithLayout({ getData, Page: LegacyPage, getLayout: null })<"P">;
