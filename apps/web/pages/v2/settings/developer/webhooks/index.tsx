import { useRouter } from "next/router";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import { Button } from "@calcom/ui/v2/core/Button";
import Loader from "@calcom/ui/v2/core/Loader";
import Meta from "@calcom/ui/v2/core/Meta";
import { getLayout } from "@calcom/ui/v2/core/layouts/AdminLayout";

import WebhookListItem from "@components/v2/settings/webhook/WebhookListItem";

const WebhooksView = () => {
  const { t } = useLocale();
  const router = useRouter();

  const { data: webhooks } = trpc.useQuery(["viewer.webhook.list"], {
    suspense: true,
    enabled: router.isReady,
  });
  return (
    <>
      <Meta title="webhooks" description="webhooks_description" />

      <div>
        {webhooks?.length ? (
          <div className="mt-6 mb-8 rounded-md border">
            {webhooks?.map((webhook, index) => (
              <WebhookListItem
                key={webhook.id}
                webhook={webhook}
                lastItem={webhooks.length === index + 1}
                onEditWebhook={() =>
                  router.push(`${WEBAPP_URL}/v2/settings/developer/webhooks/${webhook.id} `)
                }
              />
            ))}
          </div>
        ) : null}

        <Button
          color="secondary"
          StartIcon={Icon.FiPlus}
          href={`${WEBAPP_URL}/v2/settings/developer/webhooks/new`}>
          {t("new_webhook")}
        </Button>
      </div>
    </>
  );
};

WebhooksView.getLayout = getLayout;

export default WebhooksView;
