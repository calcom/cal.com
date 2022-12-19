import { EventTypeSetupInfered, FormValues } from "pages/event-types/[type]";
import { useState } from "react";
import { useFormContext } from "react-hook-form";

import { WebhookForm } from "@calcom/features/webhooks/components";
import { WebhookFormSubmitData } from "@calcom/features/webhooks/components/WebhookForm";
import WebhookListItem from "@calcom/features/webhooks/components/WebhookListItem";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, Dialog, DialogContent, EmptyScreen, Icon, showToast } from "@calcom/ui";

export const EventTeamWebhooksTab = ({
  eventType,
  team,
}: Pick<EventTypeSetupInfered, "eventType" | "team">) => {
  const formMethods = useFormContext<FormValues>();
  const { t } = useLocale();

  const utils = trpc.useContext();

  const { data: webhooks } = trpc.viewer.webhook.list.useQuery({ eventTypeId: eventType.id });

  const [newWebhookModal, setNewWebhookModal] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [webhookToEdit, setWebhookToEdit] = useState(null);

  const subscriberUrlReserved = (subscriberUrl: string, id: string): boolean => {
    return !!eventType.webhooks?.find(
      (webhook) => webhook.subscriberUrl === subscriberUrl && webhook.id !== id
    );
  };

  const createWebhookMutation = trpc.viewer.webhook.create.useMutation({
    async onSuccess() {
      showToast(t("webhook_created_successfully"), "success");
      await utils.viewer.webhook.list.invalidate();
      setNewWebhookModal(false);
    },
    onError(error) {
      showToast(`${error.message}`, "error");
    },
  });

  const onCreateWebhook = async (values: WebhookFormSubmitData) => {
    if (values.id && subscriberUrlReserved(values.subscriberUrl, values.id)) {
      showToast(t("webhook_subscriber_url_reserved"), "error");
      return;
    }

    if (!values.payloadTemplate) {
      values.payloadTemplate = null;
    }

    createWebhookMutation.mutate({
      subscriberUrl: values.subscriberUrl,
      eventTriggers: values.eventTriggers,
      active: values.active,
      payloadTemplate: values.payloadTemplate,
      secret: values.secret,
      eventTypeId: eventType.id,
    });
  };

  const NewWebhookButton = () => {
    const { t } = useLocale();
    return (
      <Button
        color="secondary"
        data-testid="new_webhook"
        StartIcon={Icon.FiPlus}
        onClick={() => setNewWebhookModal(true)}>
        {t("new_webhook")}
      </Button>
    );
  };
  return (
    <div>
      {team && webhooks && (
        <>
          <div>
            <div>
              <>
                {webhooks.length ? (
                  <>
                    <div className="mt-4 mb-8 rounded-md border">
                      {webhooks.map((webhook, index) => {
                        return (
                          <WebhookListItem
                            key={webhook.id}
                            webhook={webhook}
                            lastItem={webhooks.length === index + 1}
                            onEditWebhook={() => console.log("edit")}
                          />
                        );
                      })}
                    </div>
                    <NewWebhookButton />
                  </>
                ) : (
                  <EmptyScreen
                    Icon={Icon.FiLink}
                    headline={t("create_your_first_webhook")}
                    description={t("create_your_first_team_webhook_description", { appName: APP_NAME })}
                    buttonRaw={<NewWebhookButton />}
                  />
                )}
              </>
            </div>
          </div>

          {/* New webhook dialog */}
          <Dialog open={newWebhookModal} onOpenChange={(isOpen) => !isOpen && setNewWebhookModal(false)}>
            <DialogContent>
              <WebhookForm onSubmit={onCreateWebhook} />
            </DialogContent>
          </Dialog>
          {/* Edit webhook dialog */}
          <Dialog open={editModalOpen} onOpenChange={(isOpen) => !isOpen && setEditModalOpen(false)}>
            <DialogContent>
              <WebhookForm onSubmit={async (values: WebhookFormSubmitData) => console.log("on submit")} />
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};
