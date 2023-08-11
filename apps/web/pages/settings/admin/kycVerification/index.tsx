import PageWrapper from "@components/PageWrapper";
import { getLayout } from "@components/auth/layouts/AdminLayout";

import KYCVerificationView from "./kycVerificationView";

const KYCVerificationPage = () => <KYCVerificationView />;

KYCVerificationPage.getLayout = getLayout;
KYCVerificationPage.PageWrapper = PageWrapper;

export default KYCVerificationPage;
