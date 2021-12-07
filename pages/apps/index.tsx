import { useLocale } from "@lib/hooks/useLocale";

import Shell from "@components/Shell";
import AppStoreCategories from "@components/apps/categories";

export default function Apps() {
  const { t } = useLocale();

  const popularCategories = [
    {
      name: "Payments",
      count: 5,
    },
    {
      name: "Video Conferencing",
      count: 10,
    },
    {
      name: "Payments",
      count: 5,
    },
    {
      name: "Video Conferencing",
      count: 10,
    },
    {
      name: "Payments",
      count: 5,
    },
    {
      name: "Video Conferencing",
      count: 10,
    },
  ];

  return (
    <Shell heading={t("app_store")} subtitle={t("app_store_description")} large>
      <AppStoreCategories categories={popularCategories} />
    </Shell>
  );
}
