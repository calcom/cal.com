import type { Webhook } from "@prisma/client";
import { Webhook as TbWebhook } from "lucide-react";
import type { EventTypeSetupProps } from "pages/event-types/[type]";
import { useState } from "react";

import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import { WebhookForm } from "@calcom/features/webhooks/components";
import type { WebhookFormSubmitData } from "@calcom/features/webhooks/components/WebhookForm";
import WebhookListItem from "@calcom/features/webhooks/components/WebhookListItem";
import { subscriberUrlReserved } from "@calcom/features/webhooks/lib/subscriberUrlReserved";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert, Button, Dialog, DialogContent, EmptyScreen, showToast } from "@calcom/ui";
import { Plus, Lock } from "@calcom/ui/components/icon";

export const EventWebhooksTab = ({ eventType }: Pick<EventTypeSetupProps, "eventType">) => {
  const { t } = useLocale();

  const utils = trpc.useContext();

  const { data: webhooks } = trpc.viewer.webhook.list.useQuery({ eventTypeId: eventType.id });

  const { data: installedApps, isLoading } = trpc.viewer.integrations.useQuery({
    variant: "other",
    onlyInstalled: true,
  });

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [webhookToEdit, setWebhookToEdit] = useState<Webhook>();

  const editWebhookMutation = trpc.viewer.webhook.edit.useMutation({
    async onSuccess() {
      setEditModalOpen(false);
      await utils.viewer.webhook.list.invalidate();
      showToast(t("webhook_updated_successfully"), "success");
    },
    onError(error) {
      showToast(`${error.message}`, "error");
    },
  });

  const createWebhookMutation = trpc.viewer.webhook.create.useMutation({
    async onSuccess() {
      showToast(t("webhook_created_successfully"), "success");
      await utils.viewer.webhook.list.invalidate();
      setCreateModalOpen(false);
    },
    onError(error) {
      showToast(`${error.message}`, "error");
    },
  });

  const onCreateWebhook = async (values: WebhookFormSubmitData) => {
    if (
      subscriberUrlReserved({
        subscriberUrl: values.subscriberUrl,
        id: values.id,
        webhooks,
        eventTypeId: eventType.id,
      })
    ) {
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
        StartIcon={Plus}
        onClick={() => setCreateModalOpen(true)}>
        {t("new_webhook")}
      </Button>
    );
  };

  const { shouldLockDisableProps, isChildrenManagedEventType, isManagedEventType } = useLockedFieldsManager(
    eventType,
    t("locked_fields_admin_description"),
    t("locked_fields_member_description")
  );
  const webhookLockedStatus = shouldLockDisableProps("webhooks");

  return (
    <div>
      {webhooks && !isLoading && (
        <>
          <div>
            <div>
              <>
                {isManagedEventType && (
                  <Alert
                    severity="neutral"
                    className="mb-2"
                    title={t("locked_for_members")}
                    message={t("locked_webhooks_description")}
                  />
                )}
                {webhooks.length ? (
                  <>
                    <div className="mb-2 rounded-md border">
                      {webhooks.map((webhook, index) => {
                        return (
                          <WebhookListItem
                            key={webhook.id}
                            webhook={webhook}
                            lastItem={webhooks.length === index + 1}
                            canEditWebhook={!webhookLockedStatus.disabled}
                            onEditWebhook={() => {
                              setEditModalOpen(true);
                              setWebhookToEdit(webhook);
                            }}
                          />
                        );
                      })}
                    </div>
                    <NewWebhookButton />
                  </>
                ) : (
                  <EmptyScreen
                    Icon={TbWebhook}
                    headline={t("create_your_first_webhook")}
                    description={t("first_event_type_webhook_description")}
                    buttonRaw={
                      isChildrenManagedEventType && !isManagedEventType ? (
                        <Button StartIcon={Lock} color="secondary" disabled>
                          {t("locked_by_admin")}
                        </Button>
                      ) : (
                        <NewWebhookButton />
                      )
                    }
                  />
                )}
              </>
            </div>
          </div>

          {/* New webhook dialog */}
          <Dialog open={createModalOpen} onOpenChange={(isOpen) => !isOpen && setCreateModalOpen(false)}>
            <DialogContent
              enableOverflow
              title={t("create_webhook")}
              description={t("create_webhook_team_event_type")}>
              <WebhookForm
                onSubmit={onCreateWebhook}
                onCancel={() => setCreateModalOpen(false)}
                apps={installedApps?.items.map((app) => app.slug)}
              />
            </DialogContent>
          </Dialog>
          {/* Edit webhook dialog */}
          <Dialog open={editModalOpen} onOpenChange={(isOpen) => !isOpen && setEditModalOpen(false)}>
            <DialogContent enableOverflow title={t("edit_webhook")}>
              <WebhookForm
                webhook={webhookToEdit}
                apps={installedApps?.items.map((app) => app.slug)}
                onCancel={() => setEditModalOpen(false)}
                onSubmit={(values: WebhookFormSubmitData) => {
                  if (
                    subscriberUrlReserved({
                      subscriberUrl: values.subscriberUrl,
                      id: values.id,
                      webhooks,
                      eventTypeId: eventType.id,
                    })
                  ) {
                    showToast(t("webhook_subscriber_url_reserved"), "error");
                    return;
                  }

                  if (values.changeSecret) {
                    values.secret = values.newSecret.length ? values.newSecret : null;
                  }

                  if (!values.payloadTemplate) {
                    values.payloadTemplate = null;
                  }

                  editWebhookMutation.mutate({
                    id: webhookToEdit?.id || "",
                    subscriberUrl: values.subscriberUrl,
                    eventTriggers: values.eventTriggers,
                    active: values.active,
                    payloadTemplate: values.payloadTemplate,
                    secret: values.secret,
                    eventTypeId: webhookToEdit?.eventTypeId || undefined,
                  });
                }}
              />
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};
