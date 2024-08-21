import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import WebhookEditView from "@calcom/features/webhooks/pages/webhook-edit-view";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = WebhookEditView as CalPageWrapper;
Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
