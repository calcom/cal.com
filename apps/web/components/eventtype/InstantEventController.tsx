import type { Webhook } from "@prisma/client";
import { useSession } from "next-auth/react";
import type { EventTypeSetup } from "pages/event-types/[type]";
import { useState } from "react";
import { useFormContext } from "react-hook-form";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import { WebhookForm } from "@calcom/features/webhooks/components";
import type { WebhookFormSubmitData } from "@calcom/features/webhooks/components/WebhookForm";
import WebhookListItem from "@calcom/features/webhooks/components/WebhookListItem";
import { subscriberUrlReserved } from "@calcom/features/webhooks/lib/subscriberUrlReserved";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Alert, Button, EmptyScreen, SettingsToggle, Dialog, DialogContent, showToast } from "@calcom/ui";

type InstantEventControllerProps = {
  eventType: EventTypeSetup;
  paymentEnabled: boolean;
  isTeamEvent: boolean;
};

export default function InstantEventController({
  eventType,
  paymentEnabled,
  isTeamEvent,
}: InstantEventControllerProps) {
  const { t } = useLocale();
  const session = useSession();
  const [instantEventState, setInstantEventState] = useState<boolean>(eventType?.isInstantEvent ?? false);
  const formMethods = useFormContext<FormValues>();

  const { shouldLockDisableProps } = useLockedFieldsManager({ eventType, translate: t, formMethods });

  const instantLocked = shouldLockDisableProps("isInstantEvent");

  const isOrg = !!session.data?.user?.org?.id;

  if (session.status === "loading") return <></>;

  return (
    <LicenseRequired>
      <div className="block items-start sm:flex">
        {!isOrg || !isTeamEvent ? (
          <EmptyScreen
            headline={t("instant_tab_title")}
            Icon="phone-call"
            description={t("uprade_to_create_instant_bookings")}
            buttonRaw={<Button href="/enterprise">{t("upgrade")}</Button>}
          />
        ) : (
          <div className={!paymentEnabled ? "w-full" : ""}>
            {paymentEnabled ? (
              <Alert severity="warning" title={t("warning_payment_instant_meeting_event")} />
            ) : (
              <>
                <Alert
                  className="mb-4"
                  severity="warning"
                  title={t("warning_instant_meeting_experimental")}
                />
                <SettingsToggle
                  labelClassName="text-sm"
                  toggleSwitchAtTheEnd={true}
                  switchContainerClassName={classNames(
                    "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                    instantEventState && "rounded-b-none"
                  )}
                  childrenClassName="lg:ml-0"
                  title={t("instant_tab_title")}
                  {...instantLocked}
                  description={t("instant_event_tab_description")}
                  checked={instantEventState}
                  data-testid="instant-event-check"
                  onCheckedChange={(e) => {
                    if (!e) {
                      formMethods.setValue("isInstantEvent", false, { shouldDirty: true });
                      setInstantEventState(false);
                    } else {
                      formMethods.setValue("isInstantEvent", true, { shouldDirty: true });
                      setInstantEventState(true);
                    }
                  }}>
                  <div className="border-subtle rounded-b-lg border border-t-0 p-6">
                    {instantEventState && <InstantMeetingWebhooks eventType={eventType} />}
                  </div>
                </SettingsToggle>
              </>
            )}
          </div>
        )}
      </div>
    </LicenseRequired>
  );
}

const InstantMeetingWebhooks = ({ eventType }: { eventType: EventTypeSetup }) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const formMethods = useFormContext<FormValues>();

  const { data: webhooks } = trpc.viewer.webhook.list.useQuery({
    eventTypeId: eventType.id,
    eventTriggers: [WebhookTriggerEvents.INSTANT_MEETING],
  });
  const { data: installedApps, isPending } = trpc.viewer.integrations.useQuery({
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
        StartIcon="plus"
        onClick={() => setCreateModalOpen(true)}>
        {t("new_webhook")}
      </Button>
    );
  };

  const { shouldLockDisableProps, isChildrenManagedEventType, isManagedEventType } = useLockedFieldsManager({
    eventType,
    formMethods,
    translate: t,
  });
  const webhookLockedStatus = shouldLockDisableProps("webhooks");

  return (
    <div>
      {webhooks && !isPending && (
        <>
          <div>
            {webhooks.length ? (
              <>
                <div className="border-subtle my-2 rounded-md border">
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
                <p className="text-default text-sm font-normal">
                  {t("warning_payment_instant_meeting_event")}
                </p>
              </>
            ) : (
              <>
                <p className="text-default mb-4 text-sm font-normal">
                  {t("warning_payment_instant_meeting_event")}
                </p>
                <EmptyScreen
                  Icon="webhook"
                  headline={t("create_your_first_webhook")}
                  description={t("create_instant_meeting_webhook_description")}
                  buttonRaw={
                    isChildrenManagedEventType && !isManagedEventType ? (
                      <Button StartIcon="lock" color="secondary" disabled>
                        {t("locked_by_admin")}
                      </Button>
                    ) : (
                      <NewWebhookButton />
                    )
                  }
                />
              </>
            )}
          </div>

          {/* New webhook dialog */}
          <Dialog open={createModalOpen} onOpenChange={(isOpen) => !isOpen && setCreateModalOpen(false)}>
            <DialogContent
              enableOverflow
              title={t("create_webhook")}
              description={t("create_webhook_team_event_type")}>
              <WebhookForm
                noRoutingFormTriggers={true}
                onSubmit={onCreateWebhook}
                onCancel={() => setCreateModalOpen(false)}
                apps={installedApps?.items.map((app) => app.slug)}
                selectOnlyInstantMeetingOption={true}
              />
            </DialogContent>
          </Dialog>
          {/* Edit webhook dialog */}
          <Dialog open={editModalOpen} onOpenChange={(isOpen) => !isOpen && setEditModalOpen(false)}>
            <DialogContent enableOverflow title={t("edit_webhook")}>
              <WebhookForm
                noRoutingFormTriggers={true}
                webhook={webhookToEdit}
                apps={installedApps?.items.map((app) => app.slug)}
                onCancel={() => setEditModalOpen(false)}
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
