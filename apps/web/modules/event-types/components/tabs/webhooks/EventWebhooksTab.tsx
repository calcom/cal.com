import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import type { EventTypeSetupProps, FormValues } from "@calcom/features/eventtypes/lib/types";
import { subscriberUrlReserved } from "@calcom/features/webhooks/lib/subscriberUrlReserved";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import { APP_NAME, WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { showToast } from "@calcom/ui/components/toast";
import { revalidateEventTypeEditPage } from "@calcom/web/app/(use-page-wrapper)/event-types/[type]/actions";
import { Card, CardPanel } from "@coss/ui/components/card";
import { Dialog, DialogPanel, DialogPopup } from "@coss/ui/components/dialog";
import {
  AppHeader,
  AppHeaderActions,
  AppHeaderContent,
  AppHeaderDescription,
} from "@coss/ui/shared/app-header";
import Link from "next/link";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { WebhookForm, WebhookListItem } from "~/webhooks/components";
import type { TWebhook, WebhookFormSubmitData } from "~/webhooks/components/WebhookForm";
import { WebhookVersionCTA } from "~/webhooks/components/WebhookVersionCTA";
import { WebhookFormHeader } from "~/webhooks/views/webhook-form-header";

export const EventWebhooksTab = ({ eventType }: Pick<EventTypeSetupProps, "eventType">) => {
  const { t } = useLocale();

  const utils = trpc.useUtils();
  const formMethods = useFormContext<FormValues>();

  const { data: webhooks } = trpc.viewer.webhook.list.useQuery({ eventTypeId: eventType.id });

  const { data: installedApps, isLoading } = trpc.viewer.apps.integrations.useQuery({
    variant: "other",
    onlyInstalled: true,
  });

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [webhookToEdit, setWebhookToEdit] = useState<TWebhook>();

  const editWebhookMutation = trpc.viewer.webhook.edit.useMutation({
    async onSuccess() {
      setEditModalOpen(false);
      revalidateEventTypeEditPage(eventType.id);
      showToast(t("webhook_updated_successfully"), "success");
      await utils.viewer.webhook.list.invalidate();
      await utils.viewer.eventTypes.get.invalidate();
    },
    onError(error) {
      showToast(`${error.message}`, "error");
    },
  });

  const createWebhookMutation = trpc.viewer.webhook.create.useMutation({
    async onSuccess() {
      setCreateModalOpen(false);
      revalidateEventTypeEditPage(eventType.id);
      showToast(t("webhook_created_successfully"), "success");
      await utils.viewer.webhook.list.invalidate();
      await utils.viewer.eventTypes.get.invalidate();
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
      time: values.time,
      timeUnit: values.timeUnit,
      version: values.version,
    });
  };

  const NewWebhookButton = () => {
    const { t } = useLocale();
    return (
      <Button
        color="secondary"
        data-testid="new_webhook"
        StartIcon="plus"
        onClick={() => setCreateModalOpen(true)}>
        {t("new_webhook")}
      </Button>
    );
  };

  const { shouldLockDisableProps, isChildrenManagedEventType, isManagedEventType } = useLockedFieldsManager({
    eventType,
    translate: t,
    formMethods,
  });
  const webhooksDisableProps = shouldLockDisableProps("webhooks", { simple: true });
  const lockedText = webhooksDisableProps.isLocked ? "locked" : "unlocked";
  const cannotEditWebhooks = isChildrenManagedEventType ? webhooksDisableProps.isLocked : false;
  return (
    <div>
      {webhooks && !isLoading && (
        <>
          <div>
            <div>
              {(isManagedEventType || isChildrenManagedEventType) && (
                <Alert
                  severity={webhooksDisableProps.isLocked ? "neutral" : "info"}
                  className="mb-2"
                  title={
                    <ServerTrans
                      t={t}
                      i18nKey={`${lockedText}_${isManagedEventType ? "for_members" : "by_team_admin"}`}
                    />
                  }
                  actions={<div className="flex h-full items-center">{webhooksDisableProps.LockedIcon}</div>}
                  message={
                    <ServerTrans
                      t={t}
                      i18nKey={`webhooks_${lockedText}_${
                        isManagedEventType ? "for_members" : "by_team_admin"
                      }_description`}
                    />
                  }
                />
              )}
              {webhooks.length ? (
                <>
                  <AppHeader>
                    <AppHeaderContent title={t("webhooks")}>
                      <AppHeaderDescription>
                        {t("add_webhook_description", { appName: APP_NAME })}
                      </AppHeaderDescription>
                    </AppHeaderContent>
                    <AppHeaderActions>
                      {cannotEditWebhooks ? (
                        <Button StartIcon="lock" color="secondary" disabled>
                          {t("locked_by_team_admin")}
                        </Button>
                      ) : (
                        <NewWebhookButton />
                      )}
                    </AppHeaderActions>
                  </AppHeader>

                  <div className="mb-2 rounded-md border border-subtle p-8">
                    <Card className="mb-4">
                      <CardPanel className="p-0">
                        {webhooks.map((webhook, index) => {
                          const readOnly = isChildrenManagedEventType && webhook.eventTypeId !== eventType.id;
                          return (
                            <WebhookListItem
                              key={webhook.id}
                              webhook={webhook}
                              permissions={{
                                canEditWebhook: !readOnly,
                                canDeleteWebhook: !readOnly,
                              }}
                              onEditWebhookAction={() => {
                                setEditModalOpen(true);
                                setWebhookToEdit(webhook);
                              }}
                            />
                          );
                        })}
                      </CardPanel>
                    </Card>

                    <p className="font-normal text-default text-sm">
                      <ServerTrans
                        t={t}
                        i18nKey="edit_or_manage_webhooks"
                        components={[
                          <Link
                            key="edit_or_manage_webhooks"
                            className="cursor-pointer font-semibold underline"
                            href="/settings/developer/webhooks"
                          />,
                        ]}
                      />
                    </p>
                  </div>
                </>
              ) : (
                <EmptyScreen
                  Icon="webhook"
                  headline={t("create_your_first_webhook")}
                  description={t("first_event_type_webhook_description")}
                  buttonRaw={
                    cannotEditWebhooks ? (
                      <Button StartIcon="lock" color="secondary" disabled>
                        {t("locked_by_team_admin")}
                      </Button>
                    ) : (
                      <NewWebhookButton />
                    )
                  }
                />
              )}
            </div>
          </div>

          {/* New webhook dialog */}
          <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
            <DialogPopup showCloseButton={false} className="max-w-3xl">
              <DialogPanel>
                <WebhookForm
                  noRoutingFormTriggers={true}
                  onSubmit={onCreateWebhook}
                  onCancel={() => setCreateModalOpen(false)}
                  apps={installedApps?.items.map((app) => app.slug)}
                  headerWrapper={(formMethods, children) => (
                    <>
                      <WebhookFormHeader
                        titleKey="create_webhook"
                        showBackButton={false}
                        CTA={<WebhookVersionCTA formMethods={formMethods} />}
                      />
                      {children}
                    </>
                  )}
                />
              </DialogPanel>
            </DialogPopup>
          </Dialog>
          {/* Edit webhook dialog */}
          <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
            <DialogPopup showCloseButton={false} className="max-w-3xl">
              <DialogPanel>
                <WebhookForm
                  noRoutingFormTriggers={true}
                  webhook={webhookToEdit}
                  apps={installedApps?.items.map((app) => app.slug)}
                  onCancel={() => setEditModalOpen(false)}
                  headerWrapper={(formMethods, children) => (
                    <>
                      <WebhookFormHeader
                        titleKey="edit_webhook"
                        showBackButton={false}
                        CTA={<WebhookVersionCTA formMethods={formMethods} />}
                      />
                      {children}
                    </>
                  )}
                  onSubmit={(values: WebhookFormSubmitData) => {
                    if (
                      subscriberUrlReserved({
                        subscriberUrl: values.subscriberUrl,
                        id: webhookToEdit?.id,
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
                      timeUnit: values.timeUnit,
                      time: values.time,
                      version: values.version,
                    });
                  }}
                />
              </DialogPanel>
            </DialogPopup>
          </Dialog>
        </>
      )}
    </div>
  );
};
