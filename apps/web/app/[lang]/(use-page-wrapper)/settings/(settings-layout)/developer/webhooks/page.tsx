import { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";

import WebhooksView from "@calcom/features/webhooks/pages/webhooks-view";
import { APP_NAME } from "@calcom/lib/constants";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("webhooks"), t("add_webhook_description", { appName: APP_NAME }));
};

const WebhooksViewServerWrapper = async ({ params }: PageProps) => {
  return <WebhooksView />;
};

export default WebhooksViewServerWrapper;
