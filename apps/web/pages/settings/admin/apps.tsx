import { useLocale } from "@calcom/lib/hooks/useLocale";
import Meta from "@calcom/ui/v2/core/Meta";
import { getLayout } from "@calcom/ui/v2/core/layouts/AdminLayout";

function AdminAppsView() {
  const { t } = useLocale();
  return (
    <>
      <Meta title={t("apps")} description={t("apps_description")} />
      <h1>{t("apps_listing")}</h1>
    </>
  );
}

AdminAppsView.getLayout = getLayout;

export default AdminAppsView;
