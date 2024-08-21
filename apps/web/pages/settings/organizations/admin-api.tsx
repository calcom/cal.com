import AdminAPIViewWrapper from "@calcom/features/ee/organizations/pages/settings/admin-api";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = AdminAPIViewWrapper as CalPageWrapper;
Page.PageWrapper = PageWrapper;
Page.getLayout = getLayout;

export default Page;
