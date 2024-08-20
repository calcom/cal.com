import { _generateMetadata } from "app/_utils";

import Page from "@calcom/features/webhooks/pages/webhook-edit-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("edit_webhook"),
    (t) => t("add_webhook_description")
  );

export default Page;
