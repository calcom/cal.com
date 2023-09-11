import { checkFeatureFlag } from "@calcom/features/flags/server/utils";
import WebhookEditView from "@calcom/features/webhooks/pages/webhook-edit-view";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = WebhookEditView as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;

export const getServerSideProps = async () => {
  return checkFeatureFlag("webhooks");
};
