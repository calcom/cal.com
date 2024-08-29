import PageWrapper from "@components/PageWrapper";
import { getLayout } from "@components/auth/layouts/AdminLayout";

import LockedSMSView from "~/settings/admin/lockedSMS/lockedSMS-view";

const LockedSMSPage = () => <LockedSMSView />;

LockedSMSPage.getLayout = getLayout;
LockedSMSPage.PageWrapper = PageWrapper;

export default LockedSMSPage;
