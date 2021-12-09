import { useLocale } from "@lib/hooks/useLocale";

import Shell from "@components/Shell";
import AllApps from "@components/apps/AllApps";
import AppStoreCategories from "@components/apps/Categories";
import Slider from "@components/apps/Slider";

export default function Apps() {
  const { t } = useLocale();

  const popularCategories = [
    {
      name: "Payments",
      count: 1,
    },
    {
      name: "Video Conferencing",
      count: 3,
    },
    {
      name: "Calendar",
      count: 4,
    },
  ];

  return (
    <Shell heading={t("app_store")} subtitle={t("app_store_description")} large>
      <AppStoreCategories categories={popularCategories} />
      <Slider />
      <AllApps />
    </Shell>
  );
}
