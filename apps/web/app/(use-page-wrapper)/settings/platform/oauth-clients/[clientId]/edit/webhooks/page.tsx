import { _generateMetadata } from "app/_utils";

import EditWebhooksView from "~/settings/platform/oauth-clients/[clientId]/edit/edit-webhooks-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("webhook_update_form"),
    () => ""
  );

const ServerPageWrapper = () => {
  return <EditWebhooksView />;
};

export default ServerPageWrapper;
