// This file has been sourced from: /Users/sean/Programming/cal.com/apps/web/pages/settings/admin/index.tsx
import { Meta } from "@calcom/ui";
import PageWrapper from "@components/PageWrapper";
import { getLayout } from "@components/auth/layouts/AdminLayout";
function AdminAppsView() {
    return (<>
      <Meta title="Admin" description="admin_description"/>
      <h1>Admin index</h1>
    </>);
}
AdminAppsView.getLayout = getLayout;
AdminAppsView.PageWrapper = PageWrapper;
export default AdminAppsView;
