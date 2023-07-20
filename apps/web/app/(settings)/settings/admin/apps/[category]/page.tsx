// This file has been sourced from: /Users/sean/Programming/cal.com/apps/web/pages/settings/admin/apps/[category].tsx
import AdminAppsList from "@calcom/features/apps/AdminAppsList";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

function AdminAppsView() {
  const { t } = useLocale();
  return (
    <>
      <Meta title={t("apps")} description={t("admin_apps_description")} />
      <AdminAppsList baseURL="/settings/admin/apps" />
    </>
  );
}
export default AdminAppsView;
