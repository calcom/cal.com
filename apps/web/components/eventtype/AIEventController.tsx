import type { Webhook } from "@prisma/client";
import { useSession } from "next-auth/react";
import type { EventTypeSetup } from "pages/event-types/[type]";
import { useState } from "react";
import { useFormContext } from "react-hook-form";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import type { WebhookFormSubmitData } from "@calcom/features/webhooks/components/WebhookForm";
import { subscriberUrlReserved } from "@calcom/features/webhooks/lib/subscriberUrlReserved";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import {
  Alert,
  Button,
  EmptyScreen,
  SettingsToggle,
  Dialog,
  DialogContent,
  showToast,
  TextField,
} from "@calcom/ui";
import { Sparkles, Phone, Plus, Lock } from "@calcom/ui/components/icon";

type AIEventControllerProps = {
  eventType: EventTypeSetup;
  paymentEnabled: boolean;
  isTeamEvent: boolean;
};

export default function AIEventController({
  eventType,
  paymentEnabled,
  isTeamEvent,
}: AIEventControllerProps) {
  const { t } = useLocale();
  const session = useSession();
  const [instantEventState, setAIEventState] = useState<boolean>(eventType?.isAIEvent ?? false);
  const formMethods = useFormContext<FormValues>();

  const { shouldLockDisableProps } = useLockedFieldsManager({ eventType, translate: t, formMethods });

  const instantLocked = shouldLockDisableProps("isAIEvent");

  //todo const isOrg = !!session.data?.user?.org?.id;
  const isOrg = true;

  if (session.status === "loading") return <></>;

  return (
    <LicenseRequired>
      <div className="block items-start sm:flex">
        {!isOrg || !isTeamEvent ? (
          <EmptyScreen
            headline={t("Cal.ai")}
            Icon={Sparkles}
            description={t(
              "Upgrade to Enterprise to generate an AI Agent phone number that can call guests to schedule calls" /*"uprade_to_create_instant_bookings" */
            )}
            buttonRaw={<Button href="/enterprise">{t("upgrade")}</Button>}
          />
        ) : (
          <div className={!paymentEnabled ? "w-full" : ""}>
            {paymentEnabled ? (
              <Alert severity="warning" title={t("warning_payment_instant_meeting_event")} />
            ) : (
              <>
                <SettingsToggle
                  labelClassName="text-sm"
                  toggleSwitchAtTheEnd={true}
                  switchContainerClassName={classNames(
                    "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                    instantEventState && "rounded-b-none"
                  )}
                  childrenClassName="lg:ml-0"
                  title={t("Cal.ai" /* todo "ai_tab_title"*/)}
                  {...instantLocked}
                  description={t("Create an AI phone number" /* todo "instant_event_tab_description" */)}
                  checked={instantEventState}
                  data-testid="instant-event-check"
                  onCheckedChange={(e) => {
                    if (!e) {
                      formMethods.setValue("isAIEvent", false, { shouldDirty: true });
                      setAIEventState(false);
                    } else {
                      formMethods.setValue("isAIEvent", true, { shouldDirty: true });
                      setAIEventState(true);
                    }
                  }}>
                  <div className="border-subtle rounded-b-lg border border-t-0 p-6">
                    {instantEventState && <AISettings eventType={eventType} />}
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

const AISettings = ({ eventType }: { eventType: EventTypeSetup }) => {
  const { t } = useLocale();
  const utils = trpc.useContext();
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

  const NewPhoneButton = () => {
    const { t } = useLocale();
    return (
      <Button
        color="secondary"
        data-testid="new_phone_number"
        StartIcon={Plus}
        onClick={() => setCreateModalOpen(true)}>
        {t("New Phone number" /*todo "new_webhook" */)}
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
                  {/* {webhooks.map((webhook, index) => {
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
                  })} */}
                </div>
              </>
            ) : (
              <>
                <EmptyScreen
                  Icon={Phone}
                  headline={t("Create your phone number" /* todo "create_your_first_webhook" */)}
                  description={t(
                    "This phone number can be called by guests but can also do proactive outbound calls by the AI agent." /* todo "create_instant_meeting_webhook_description" */
                  )}
                  buttonRaw={
                    isChildrenManagedEventType && !isManagedEventType ? (
                      <Button StartIcon={Lock} color="secondary" disabled>
                        {t("locked_by_admin")}
                      </Button>
                    ) : (
                      <>
                        <NewPhoneButton />
                        <Button>Learn More</Button>
                      </>
                    )
                  }
                />
              </>
            )}
          </div>

          {/* New phone dialog */}
          <Dialog open={createModalOpen} onOpenChange={(isOpen) => !isOpen && setCreateModalOpen(false)}>
            <DialogContent
              enableOverflow
              title={t("Create phone number" /* todo "create_phone_number" */)}
              description={t(
                "This number can later be called or can do proactive outbound calls" /* todo "create_phone_number_description" */
              )}>
              <div className="mb-12 mt-4">
                <TextField placeholder="+415" hint="Area Code" />
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};
