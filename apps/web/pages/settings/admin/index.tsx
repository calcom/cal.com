import { getAdminLayout as getLayout, Meta } from "@calcom/ui";

function AdminAppsView() {
  return (
    <>
      <Meta title="Admin" description="admin_description" />
      <h1>Admin index</h1>
    </>
  );
}

AdminAppsView.getLayout = getLayout;

export default AdminAppsView;
