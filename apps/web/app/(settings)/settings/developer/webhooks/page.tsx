// This file has been sourced from: /Users/sean/Programming/cal.com/apps/web/pages/settings/developer/webhooks/index.tsx
import WeebhooksView from "@calcom/features/webhooks/pages/webhooks-view";
import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";
const Page = WeebhooksView as CalPageWrapper;
Page.PageWrapper = PageWrapper;
export default Page;
