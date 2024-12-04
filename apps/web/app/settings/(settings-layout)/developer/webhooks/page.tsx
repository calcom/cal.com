import { _generateMetadata } from "app/_utils";

import WebhooksView from "@calcom/features/webhooks/pages/webhooks-view";
import { APP_NAME } from "@calcom/lib/constants";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("webhooks"),
    (t) => t("add_webhook_description", { appName: APP_NAME })
  );

export default WebhooksView;
