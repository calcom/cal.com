import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";

import { WebhookRepository } from "@calcom/features/webhooks/lib/repository/WebhookRepository";
import { APP_NAME } from "@calcom/lib/constants";

import { EditWebhookView } from "~/webhooks/views/webhook-edit-view";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("webhooks"),
    (t) => t("add_webhook_description", { appName: APP_NAME }),
    undefined,
    undefined,
    `/settings/developer/webhooks/${(await params).id}`
  );

const Page = async ({ params: _params }: PageProps) => {
  const params = await _params;
  const id = typeof params?.id === "string" ? params.id : undefined;

  const webhookRepository = WebhookRepository.getInstance();
  const webhook = await webhookRepository.findByWebhookId(id);

  return <EditWebhookView webhook={webhook} />;
};

export default Page;
