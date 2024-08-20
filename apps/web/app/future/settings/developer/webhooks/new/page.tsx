import { _generateMetadata } from "app/_utils";

import Page from "@calcom/features/webhooks/pages/webhook-new-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("add_webhook"),
    (t) => t("add_webhook_description")
  );

export default Page;
