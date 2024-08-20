import { _generateMetadata } from "app/_utils";

import Page from "@calcom/features/webhooks/pages/webhooks-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("webhooks"),
    (t) => t("add_webhook_description")
  );

export default Page;
