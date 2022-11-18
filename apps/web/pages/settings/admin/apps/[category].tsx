import AdminAppsList from "@calcom/features/apps/AdminAppsList";
import Meta from "@calcom/ui/v2/core/Meta";
import { getLayout } from "@calcom/ui/v2/core/layouts/SettingsLayout";

function AdminAppsView() {
  return (
    <>
      <Meta title="Apps" description="apps_description" />
      <AdminAppsList baseURL="/settings/admin/apps" />
    </>
  );
}

AdminAppsView.getLayout = getLayout;

export default AdminAppsView;
