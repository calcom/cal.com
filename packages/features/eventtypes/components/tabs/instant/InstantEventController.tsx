import type { Webhook } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { components } from "react-select";
import type { OptionProps, SingleValueProps } from "react-select";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import type { EventTypeSetup, FormValues, AvailabilityOption } from "@calcom/features/eventtypes/lib/types";
import { WebhookForm } from "@calcom/features/webhooks/components";
import type { WebhookFormSubmitData } from "@calcom/features/webhooks/components/WebhookForm";
import WebhookListItem from "@calcom/features/webhooks/components/WebhookListItem";
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
  Label,
  Select,
  Badge,
} from "@calcom/ui";

type InstantEventControllerProps = {
  eventType: EventTypeSetup;
  paymentEnabled: boolean;
  isTeamEvent: boolean;
};

const Option = ({ ...props }: OptionProps<AvailabilityOption>) => {
  const { label, isDefault } = props.data;
  const { t } = useLocale();
  return (
    <components.Option {...props}>
      <span>{label}</span>
      {isDefault && (
        <Badge variant="blue" className="ml-2">
          {t("default")}
        </Badge>
      )}
    </components.Option>
  );
};

const SingleValue = ({ ...props }: SingleValueProps<AvailabilityOption>) => {
  const { label, isDefault } = props.data;
  const { t } = useLocale();
  return (
    <components.SingleValue {...props}>
      <span>{label}</span>
      {isDefault && (
        <Badge variant="blue" className="ml-2">
          {t("default")}
        </Badge>
      )}
    </components.SingleValue>
  );
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

  const { shouldLockDisableProps } = useLockedFieldsManager({
    eventType,
    translate: t,
    formMethods,
  });

  const instantLocked = shouldLockDisableProps("isInstantEvent");

  const isOrg = !!session.data?.user?.org?.id;

  const { data, isPending } = trpc.viewer.availability.list.useQuery(undefined);

  if (session.status === "loading" || isPending || !data) return <></>;

  const schedules = data.schedules;

  const options = schedules.map((schedule) => ({
    value: schedule.id,
    label: schedule.name,
    isDefault: schedule.isDefault,
    isManaged: false,
  }));

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
                    {instantEventState && (
                      <div className="flex flex-col gap-2">
                        <Controller
                          name="instantMeetingSchedule"
                          render={({ field: { onChange, value } }) => {
                            const optionValue: AvailabilityOption | undefined = options.find(
                              (option) => option.value === value
                            );
                            return (
                              <>
                                <Label>{t("instant_meeting_availability")}</Label>
                                <Select
                                  placeholder={t("select")}
                                  options={options}
                                  isDisabled={shouldLockDisableProps("instantMeetingSchedule").disabled}
                                  isSearchable={false}
                                  onChange={(selected) => {
                                    if (selected) onChange(selected.value);
                                  }}
                                  className="mb-4 block w-full min-w-0 flex-1 rounded-sm text-sm"
                                  value={optionValue}
                                  components={{ Option, SingleValue }}
                                  isMulti={false}
                                />
                              </>
                            );
                          }}
                        />
                        <Controller
                          name="instantMeetingExpiryTimeOffsetInSeconds"
                          render={({ field: { value, onChange } }) => (
                            <>
                              <Label>{t("set_instant_meeting_expiry_time_offset_description")}</Label>
                              <TextField
                                required
                                name="instantMeetingExpiryTimeOffsetInSeconds"
                                labelSrOnly
                                type="number"
                                defaultValue={value}
                                min={10}
                                containerClassName="max-w-80"
                                addOnSuffix={<>{t("seconds")}</>}
                                onChange={(e) => {
                                  onChange(Math.abs(Number(e.target.value)));
                                }}
                                data-testid="instant-meeting-expiry-time-offset"
                              />
                            </>
                          )}
                        />
                        <InstantMeetingWebhooks eventType={eventType} />
                      </div>
                    )}
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
