import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import EditWebhooksView from "~/settings/platform/oauth-clients/[clientId]/edit/edit-webhooks-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("webhook_update_form"), "");
};

const ServerPageWrapper = () => {
  return <EditWebhooksView />;
};

export default ServerPageWrapper;
