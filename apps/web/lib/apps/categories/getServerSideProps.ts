import { getAppRegistry, getAppRegistryWithCredentials } from "@calcom/app-store/_appRegistry";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import type { GetServerSidePropsContext } from "next";

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { req } = context;

  const session = await getServerSession({ req });

  let appStore;
  if (session?.user?.id) {
    appStore = await getAppRegistryWithCredentials(session.user.id);
  } else {
    appStore = await getAppRegistry();
  }

  const categories = appStore.reduce(
    (c, app) => {
      for (const category of app.categories) {
        c[category] = c[category] ? c[category] + 1 : 1;
      }
      return c;
    },
    {} as Record<string, number>
  );

  return {
    props: {
      categories: Object.entries(categories).map(([name, count]) => ({ name, count })),
    },
  };
};
