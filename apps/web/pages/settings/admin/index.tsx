import { Meta } from "@calcom/ui";

import { getLayout } from "@components/auth/layouts/AdminLayout";

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
