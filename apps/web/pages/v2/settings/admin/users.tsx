import Meta from "@calcom/ui/v2/core/Meta";
import { getLayout } from "@calcom/ui/v2/core/layouts/AdminLayout";

function AdminUsersView() {
  return (
    <>
      <Meta title="Users" description="users_description" />
      <h1>Users listing</h1>
    </>
  );
}

AdminUsersView.getLayout = getLayout;

export default AdminUsersView;
