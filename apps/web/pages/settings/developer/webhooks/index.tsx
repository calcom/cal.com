import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import WebhooksView from "@calcom/features/webhooks/pages/webhooks-view";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = WebhooksView as CalPageWrapper;
Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
