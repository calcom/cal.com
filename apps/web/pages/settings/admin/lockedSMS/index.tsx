import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";
import { getLayout } from "@components/auth/layouts/AdminLayout";

import LockedSMSView from "~/settings/admin/locked-sms-view";

const LockedSMSPage = () => (
  <>
    <Meta title="Locked SMS" description="Lock or unlock SMS sending for users" />
    <LockedSMSView />
  </>
);

LockedSMSPage.getLayout = getLayout;
LockedSMSPage.PageWrapper = PageWrapper;

export default LockedSMSPage;
