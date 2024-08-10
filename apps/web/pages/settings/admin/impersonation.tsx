import PageWrapper from "@components/PageWrapper";
import { getLayout } from "@components/auth/layouts/AdminLayout";

import ImpersonationView from "~/settings/admin/impersonation/impersonation-view";

const ImpersonationPage = () => <ImpersonationView />;

ImpersonationPage.getLayout = getLayout;
ImpersonationPage.PageWrapper = PageWrapper;

export default ImpersonationPage;
