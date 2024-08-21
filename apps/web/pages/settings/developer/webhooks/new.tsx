import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import WebhookNewPage from "@calcom/features/webhooks/pages/webhook-new-view";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = WebhookNewPage as CalPageWrapper;
Page.PageWrapper = PageWrapper;
Page.getLayout = getLayout;

export default Page;
