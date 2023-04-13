import { WebhookTriggerEvents } from "@prisma/client";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Button, Form, Label, Select, Switch, TextArea, TextField, ToggleGroup } from "@calcom/ui";

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
    { value: WebhookTriggerEvents.BOOKING_RESCHEDULED, label: "booking_rescheduled" },
    { value: WebhookTriggerEvents.MEETING_ENDED, label: "meeting_ended" },
  ],
  "routing-forms": [{ value: WebhookTriggerEvents.FORM_SUBMITTED, label: "form_submitted" }],
} as const;

const WebhookForm = (props: {
  webhook?: WebhookFormData;
  apps?: (keyof typeof WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP_V2)[];
  onSubmit: (event: WebhookFormSubmitData) => void;
  onCancel?: () => void;
}) => {
  const { apps = [] } = props;
  const { t } = useLocale();

  const triggerOptions = [...WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP_V2["core"]];
  if (apps) {
    for (const app of apps) {
      if (WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP_V2[app]) {
        triggerOptions.push(...WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP_V2[app]);
      }
    }
  }
  const translatedTriggerOptions = triggerOptions.map((option) => ({ ...option, label: t(option.label) }));

  const formMethods = useForm({
    defaultValues: {
      subscriberUrl: props.webhook?.subscriberUrl || "",
      active: props.webhook ? props.webhook.active : true,
      eventTriggers: !props.webhook
        ? translatedTriggerOptions.map((option) => option.value)
        : props.webhook.eventTriggers,
      secret: props?.webhook?.secret || "",
      payloadTemplate: props?.webhook?.payloadTemplate || undefined,
    },
  });

  const [useCustomTemplate, setUseCustomTemplate] = useState(false);
  const [newSecret, setNewSecret] = useState("");
  const [changeSecret, setChangeSecret] = useState(false);
  const hasSecretKey = !!props?.webhook?.secret;
  // const currentSecret = props?.webhook?.secret;

  useEffect(() => {
    if (changeSecret) {
      formMethods.unregister("secret", { keepDefaultValue: false });
    }
  }, [changeSecret]);

  return (
    <>
      <Form
        form={formMethods}
        handleSubmit={(values) => props.onSubmit({ ...values, changeSecret, newSecret })}>
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
                  formMethods.setValue("subscriberUrl", e?.target.value);
                  if (hasTemplateIntegration({ url: e.target.value })) {
                    setUseCustomTemplate(true);
                    formMethods.setValue("payloadTemplate", customTemplate({ url: e.target.value }));
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
            <div className="font-sm text-emphasis mt-8 font-medium">
              <Switch
                label={t("enable_webhook")}
                checked={value}
                // defaultChecked={props?.webhook?.active ? props?.webhook?.active : true}
                onCheckedChange={(value) => {
                  formMethods.setValue("active", value);
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
              <div className="mt-8">
                <Label className="font-sm text-emphasis mt-8 font-medium">
                  <>{t("event_triggers")}</>
                </Label>
                <Select
                  options={translatedTriggerOptions}
                  isMulti
                  value={selectValue}
                  onChange={(event) => {
                    onChange(event.map((selection) => selection.value));
                  }}
                />
              </div>
            );
          }}
        />
        <Controller
          name="secret"
          control={formMethods.control}
          render={({ field: { value } }) => (
            <div className="mt-8 ">
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
                    formMethods.setValue("secret", e?.target.value);
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
              <Label className="font-sm text-emphasis mt-8">
                <>{t("payload_template")}</>
              </Label>
              <div className="mb-2">
                <ToggleGroup
                  onValueChange={(val) => {
                    if (val === "default") {
                      setUseCustomTemplate(false);
                      formMethods.setValue("payloadTemplate", undefined);
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
                    formMethods.setValue("payloadTemplate", e?.target.value);
                  }}
                />
              )}
            </>
          )}
        />
        <div className="bg-subtle mt-8 rounded-md p-6">
          <WebhookTestDisclosure />
        </div>

        <div className="mt-12 flex place-content-end space-x-4">
          <Button
            type="button"
            color="minimal"
            onClick={props.onCancel}
            {...(!props.onCancel ? { href: `${WEBAPP_URL}/settings/developer/webhooks` } : {})}>
            {t("cancel")}
          </Button>
          <Button type="submit" loading={formMethods.formState.isSubmitting}>
            {props?.webhook?.id ? t("save") : t("create_webhook")}
          </Button>
        </div>
      </Form>
    </>
  );
};

export default WebhookForm;
