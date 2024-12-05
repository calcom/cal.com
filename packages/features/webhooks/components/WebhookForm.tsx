import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { TimeTimeUnitInput } from "@calcom/features/ee/workflows/components/TimeTimeUnitInput";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { TimeUnit } from "@calcom/prisma/enums";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Button, Form, Label, Select, Switch, TextArea, TextField, ToggleGroup } from "@calcom/ui";

import SectionBottomActions from "../../settings/SectionBottomActions";
import customTemplate, { hasTemplateIntegration } from "../lib/integrationTemplate";
import WebhookTestDisclosure from "./WebhookTestDisclosure";

export type TWebhook = RouterOutputs["viewer"]["webhook"]["list"][number];

export type WebhookFormData = {
  id?: string;
  subscriberUrl: string;
  active: boolean;
  eventTriggers: WebhookTriggerEvents[];
  secret: string | null;
  payloadTemplate: string | undefined | null;
  time?: number | null;
  timeUnit?: TimeUnit | null;
};

export type WebhookFormSubmitData = WebhookFormData & {
  changeSecret: boolean;
  newSecret: string;
};

type WebhookTriggerEventOptions = readonly { value: WebhookTriggerEvents; label: string }[];

const WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP_V2: Record<string, WebhookTriggerEventOptions> = {
  core: [
    { value: WebhookTriggerEvents.BOOKING_CANCELLED, label: "booking_cancelled" },
    { value: WebhookTriggerEvents.BOOKING_CREATED, label: "booking_created" },
    { value: WebhookTriggerEvents.BOOKING_REJECTED, label: "booking_rejected" },
    { value: WebhookTriggerEvents.BOOKING_REQUESTED, label: "booking_requested" },
    { value: WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED, label: "booking_payment_initiated" },
    { value: WebhookTriggerEvents.BOOKING_RESCHEDULED, label: "booking_rescheduled" },
    { value: WebhookTriggerEvents.BOOKING_PAID, label: "booking_paid" },
    { value: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED, label: "booking_no_show_updated" },
    { value: WebhookTriggerEvents.MEETING_ENDED, label: "meeting_ended" },
    { value: WebhookTriggerEvents.MEETING_STARTED, label: "meeting_started" },
    { value: WebhookTriggerEvents.RECORDING_READY, label: "recording_ready" },
    { value: WebhookTriggerEvents.INSTANT_MEETING, label: "instant_meeting" },
    { value: WebhookTriggerEvents.OOO_CREATED, label: "ooo_created" },
    {
      value: WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED,
      label: "recording_transcription_generated",
    },
    { value: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW, label: "after_hosts_cal_video_no_show" },
    {
      value: WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
      label: "after_guests_cal_video_no_show",
    },
  ],
  "routing-forms": [
    { value: WebhookTriggerEvents.FORM_SUBMITTED, label: "form_submitted" },
    { value: WebhookTriggerEvents.FORM_SUBMITTED_NO_EVENT, label: "form_submitted_no_event" },
  ],
} as const;

export type WebhookFormValues = {
  subscriberUrl: string;
  active: boolean;
  eventTriggers: WebhookTriggerEvents[];
  secret: string | null;
  payloadTemplate: string | undefined | null;
  time?: number | null;
  timeUnit?: TimeUnit | null;
};

const WebhookForm = (props: {
  webhook?: WebhookFormData;
  apps?: (keyof typeof WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP_V2)[];
  overrideTriggerOptions?: (typeof WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP_V2)["core"];
  onSubmit: (event: WebhookFormSubmitData) => void;
  onCancel?: () => void;
  noRoutingFormTriggers: boolean;
  selectOnlyInstantMeetingOption?: boolean;
}) => {
  const { apps = [], selectOnlyInstantMeetingOption = false, overrideTriggerOptions } = props;
  const { t } = useLocale();

  const triggerOptions = overrideTriggerOptions
    ? [...overrideTriggerOptions]
    : [...WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP_V2["core"]];
  if (apps) {
    for (const app of apps) {
      if (app === "routing-forms" && props.noRoutingFormTriggers) continue;
      if (WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP_V2[app]) {
        triggerOptions.push(...WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP_V2[app]);
      }
    }
  }
  const translatedTriggerOptions = triggerOptions.map((option) => ({ ...option, label: t(option.label) }));

  const getEventTriggers = () => {
    if (props.webhook) return props.webhook.eventTriggers;

    return (
      selectOnlyInstantMeetingOption
        ? translatedTriggerOptions.filter((option) => option.value === WebhookTriggerEvents.INSTANT_MEETING)
        : translatedTriggerOptions.filter((option) => option.value !== WebhookTriggerEvents.INSTANT_MEETING)
    ).map((option) => option.value);
  };

  const formMethods = useForm({
    defaultValues: {
      subscriberUrl: props.webhook?.subscriberUrl || "",
      active: props.webhook ? props.webhook.active : true,
      eventTriggers: getEventTriggers(),
      secret: props?.webhook?.secret || "",
      payloadTemplate: props?.webhook?.payloadTemplate || undefined,
      timeUnit: props?.webhook?.timeUnit || undefined,
      time: props?.webhook?.time || undefined,
    },
  });

  const [useCustomTemplate, setUseCustomTemplate] = useState(false);
  const [newSecret, setNewSecret] = useState("");
  const [changeSecret, setChangeSecret] = useState<boolean>(false);
  const hasSecretKey = !!props?.webhook?.secret;

  const [showTimeSection, setShowTimeSection] = useState(
    !!triggerOptions.find(
      (trigger) =>
        trigger.value === WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW ||
        trigger.value === WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW
    )
  );

  useEffect(() => {
    if (changeSecret) {
      formMethods.unregister("secret", { keepDefaultValue: false });
    }
  }, [changeSecret, formMethods]);

  return (
    <Form
      form={formMethods}
      handleSubmit={(values) => props.onSubmit({ ...values, changeSecret, newSecret })}>
      <div className="border-subtle border-x p-6">
        <Controller
          name="subscriberUrl"
          control={formMethods.control}
          render={({ field: { value } }) => (
            <>
              <TextField
                name="subscriberUrl"
                label={t("subscriber_url")}
                labelClassName="font-medium text-emphasis font-sm"
                value={value}
                required
                type="url"
                onChange={(e) => {
                  formMethods.setValue("subscriberUrl", e?.target.value, { shouldDirty: true });
                  if (hasTemplateIntegration({ url: e.target.value })) {
                    setUseCustomTemplate(true);
                    formMethods.setValue("payloadTemplate", customTemplate({ url: e.target.value }), {
                      shouldDirty: true,
                    });
                  }
                }}
              />
            </>
          )}
        />
        <Controller
          name="active"
          control={formMethods.control}
          render={({ field: { value } }) => (
            <div className="font-sm text-emphasis mt-6 font-medium">
              <Switch
                label={t("enable_webhook")}
                checked={value}
                // defaultChecked={props?.webhook?.active ? props?.webhook?.active : true}
                onCheckedChange={(value) => {
                  formMethods.setValue("active", value, { shouldDirty: true });
                }}
              />
            </div>
          )}
        />
        <Controller
          name="eventTriggers"
          control={formMethods.control}
          render={({ field: { onChange, value } }) => {
            const selectValue = translatedTriggerOptions.filter((option) => value.includes(option.value));
            return (
              <div className="mt-6">
                <Label className="font-sm text-emphasis font-medium">
                  <>{t("event_triggers")}</>
                </Label>
                <Select
                  options={translatedTriggerOptions}
                  isMulti
                  value={selectValue}
                  onChange={(event) => {
                    onChange(event.map((selection) => selection.value));
                    const noShowWebhookTriggerExists = !!event.find(
                      (trigger) =>
                        trigger.value === WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW ||
                        trigger.value === WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW
                    );

                    if (noShowWebhookTriggerExists) {
                      formMethods.setValue("time", props.webhook?.time ?? 5, { shouldDirty: true });
                      formMethods.setValue("timeUnit", props.webhook?.timeUnit ?? TimeUnit.MINUTE, {
                        shouldDirty: true,
                      });
                    } else {
                      formMethods.setValue("time", undefined, { shouldDirty: true });
                      formMethods.setValue("timeUnit", undefined, { shouldDirty: true });
                    }

                    setShowTimeSection(noShowWebhookTriggerExists);
                  }}
                />
              </div>
            );
          }}
        />

        {showTimeSection && (
          <div className="mt-5">
            <Label>{t("how_long_after_user_no_show_minutes")}</Label>
            <TimeTimeUnitInput disabled={false} />
          </div>
        )}

        <Controller
          name="secret"
          control={formMethods.control}
          render={({ field: { value } }) => (
            <div className="mt-6">
              {!!hasSecretKey && !changeSecret && (
                <>
                  <Label className="font-sm text-emphasis font-medium">Secret</Label>
                  <div className="bg-default space-y-0 rounded-md border-0 border-neutral-200 sm:mx-0 md:border">
                    <div className="text-emphasis rounded-sm border-b p-2 text-sm">
                      {t("forgotten_secret_description")}
                    </div>
                    <div className="p-2">
                      <Button
                        color="secondary"
                        type="button"
                        onClick={() => {
                          setChangeSecret(true);
                        }}>
                        {t("change_secret")}
                      </Button>
                    </div>
                  </div>
                </>
              )}
              {!!hasSecretKey && changeSecret && (
                <>
                  <TextField
                    autoComplete="off"
                    label={t("secret")}
                    labelClassName="font-medium text-emphasis font-sm"
                    {...formMethods.register("secret")}
                    value={newSecret}
                    onChange={(event) => setNewSecret(event.currentTarget.value)}
                    type="text"
                    placeholder={t("leave_blank_to_remove_secret")}
                  />
                  <Button
                    color="secondary"
                    type="button"
                    className="py-1 text-xs"
                    onClick={() => {
                      setChangeSecret(false);
                    }}>
                    {t("cancel")}
                  </Button>
                </>
              )}
              {!hasSecretKey && (
                <TextField
                  name="secret"
                  label={t("secret")}
                  labelClassName="font-medium text-emphasis font-sm"
                  value={value}
                  onChange={(e) => {
                    formMethods.setValue("secret", e?.target.value, { shouldDirty: true });
                  }}
                />
              )}
            </div>
          )}
        />

        <Controller
          name="payloadTemplate"
          control={formMethods.control}
          render={({ field: { value } }) => (
            <>
              <Label className="font-sm text-emphasis mt-6">
                <>{t("payload_template")}</>
              </Label>
              <div className="mb-2">
                <ToggleGroup
                  onValueChange={(val) => {
                    if (val === "default") {
                      setUseCustomTemplate(false);
                      formMethods.setValue("payloadTemplate", undefined, { shouldDirty: true });
                    } else {
                      setUseCustomTemplate(true);
                    }
                  }}
                  defaultValue={value ? "custom" : "default"}
                  options={[
                    { value: "default", label: t("default") },
                    { value: "custom", label: t("custom") },
                  ]}
                  isFullWidth={true}
                />
              </div>
              {useCustomTemplate && (
                <TextArea
                  name="customPayloadTemplate"
                  rows={3}
                  value={value}
                  onChange={(e) => {
                    formMethods.setValue("payloadTemplate", e?.target.value, { shouldDirty: true });
                  }}
                />
              )}
            </>
          )}
        />
      </div>
      <SectionBottomActions align="end">
        <Button
          type="button"
          color="minimal"
          onClick={props.onCancel}
          {...(!props.onCancel ? { href: `${WEBAPP_URL}/settings/developer/webhooks` } : {})}>
          {t("cancel")}
        </Button>
        <Button
          type="submit"
          data-testid="create_webhook"
          disabled={!formMethods.formState.isDirty && !changeSecret}
          loading={formMethods.formState.isSubmitting}>
          {props?.webhook?.id ? t("save") : t("create_webhook")}
        </Button>
      </SectionBottomActions>

      <div className="mt-6 rounded-md">
        <WebhookTestDisclosure />
      </div>
    </Form>
  );
};

export default WebhookForm;
