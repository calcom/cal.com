import WeebhookNewView from "@calcom/features/webhooks/pages/webhook-new-view";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = WeebhookNewView as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
