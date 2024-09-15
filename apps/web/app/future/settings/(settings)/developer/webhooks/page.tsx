import { _generateMetadata } from "app/_utils";

import { WebhooksViewAppDir } from "@calcom/features/webhooks/pages/webhooks-view";
import { APP_NAME } from "@calcom/lib/constants";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("webhooks"),
    (t) => t("add_webhook_description", { appName: APP_NAME })
  );

const Page = () => {
  return <WebhooksViewAppDir />;
};

export default Page;
