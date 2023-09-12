import AdminAppsList from "@calcom/features/apps/AdminAppsList";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";
import { getLayout } from "@components/auth/layouts/AdminLayout";

function AdminAppsView() {
  const { t } = useLocale();
  return (
    <>
      <Meta title={t("apps")} description={t("admin_apps_description")} />
      <AdminAppsList baseURL="/settings/admin/apps" />
    </>
  );
}

AdminAppsView.getLayout = getLayout;
AdminAppsView.PageWrapper = PageWrapper;

export default AdminAppsView;
