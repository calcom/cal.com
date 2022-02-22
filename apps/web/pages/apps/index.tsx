import { getAppRegistry } from "@calcom/app-store/_appRegistry";

import { useLocale } from "@lib/hooks/useLocale";

import AppsShell from "@components/AppsShell";
import Shell from "@components/Shell";
import AllApps from "@components/apps/AllApps";
import AppStoreCategories from "@components/apps/Categories";
import Slider from "@components/apps/Slider";

export default function Apps({ appStore, categories }) {
  const { t } = useLocale();

  return (
    <Shell heading={t("app_store")} subtitle={t("app_store_description")} large>
      <AppsShell>
        <AppStoreCategories categories={categories} />
        <Slider items={appStore} />
        <AllApps apps={appStore} />
      </AppsShell>
    </Shell>
  );
}

export const getStaticProps = async () => {
  const appStore = getAppRegistry();
  const categories = appStore.reduce((c, app) => {
    if (c[app.category]) {
      c[app.category] = c[app.category]++;
    } else {
      c[app.category] = 1;
    }
    return c;
  }, {});

  return {
    props: {
      categories: Object.entries(categories).map(([name, count]) => ({ name, count })),
      appStore,
    },
  };
};
