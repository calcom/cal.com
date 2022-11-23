import { getAdminLayout as getLayout, Meta } from "@calcom/ui";

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
