import { _generateMetadata } from "app/_utils";

import EditOAuthClientWebhook from "~/settings/platform/webhooks/edit-webhooks-view";

export const generateMetadata = async ({
  searchParams,
}: {
  searchParams: Promise<{ clientId: string; webhookId: string }>;
}) => {
  const { clientId, webhookId } = await searchParams;
  return await _generateMetadata(
    (t) => t("webhook_update_form"),
    () => "",
    undefined,
    undefined,
    `/settings/platform/webhooks/edit?clientId=${clientId}&webhookId=${webhookId}`
  );
};

const ServerPageWrapper = () => {
  return <EditOAuthClientWebhook />;
};

export default ServerPageWrapper;
