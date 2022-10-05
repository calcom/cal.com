import Meta from "@calcom/ui/v2/core/Meta";
import { getLayout } from "@calcom/ui/v2/core/layouts/AdminLayout";

function AdminAppsView() {
  return (
    <>
      <Meta title="Apps" description="apps_description" />
      <h1>App listing</h1>
    </>
  );
}

AdminAppsView.getLayout = getLayout;

export default AdminAppsView;
