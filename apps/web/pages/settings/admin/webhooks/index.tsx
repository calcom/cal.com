import WeebhooksView from "@calcom/features/webhooks/pages/webhooks-view";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = WeebhooksView as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
