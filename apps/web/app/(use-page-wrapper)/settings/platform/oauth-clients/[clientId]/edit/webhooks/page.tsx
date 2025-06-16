import { _generateMetadata } from "app/_utils";

import EditWebhooksView from "~/settings/platform/oauth-clients/[clientId]/edit/edit-webhooks-view";

export const generateMetadata = async ({ params }: { params: Promise<{ clientId: string }> }) =>
  await _generateMetadata(
    (t) => t("webhook_update_form"),
    () => "",
    undefined,
    undefined,
    `/settings/platform/oauth-clients/${(await params).clientId}/edit/webhooks`
  );

const ServerPageWrapper = () => {
  return <EditWebhooksView />;
};

export default ServerPageWrapper;
