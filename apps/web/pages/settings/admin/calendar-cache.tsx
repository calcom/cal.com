import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";
import { getLayout } from "@components/auth/layouts/AdminLayout";

function AdminCalendarCacheView() {
  return (
    <>
      <Meta title="Admin" description="admin_description" />
      <h1>Calendar cache index</h1>
    </>
  );
}

AdminCalendarCacheView.getLayout = getLayout;
AdminCalendarCacheView.PageWrapper = PageWrapper;

export default AdminCalendarCacheView;
