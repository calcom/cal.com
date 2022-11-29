import { getAdminLayout as getLayout, Meta } from "@calcom/ui";

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
