import { useState } from "react";
import { useForm, Controller } from "react-hook-form";

import { classNames } from "@calcom/lib";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WebhookTriggerEvents } from "@calcom/prisma/client";
import { inferQueryOutput, trpc } from "@calcom/trpc/react";
import Button from "@calcom/ui/v2/core/Button";
import Switch from "@calcom/ui/v2/core/Switch";
import Select from "@calcom/ui/v2/core/form/Select";
import { Form, Label, Input, TextField, TextArea } from "@calcom/ui/v2/core/form/fields";
import showToast from "@calcom/ui/v2/core/notifications";

import { WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP_V2 } from "@lib/webhooks/constants";
import customTemplate, { hasTemplateIntegration } from "@lib/webhooks/integrationTemplate";

import WebhookTestDisclosure from "@components/v2/settings/webhook/WebhookTestDisclosure";

export type TWebhook = inferQueryOutput<"viewer.webhook.list">[number];

export type WebhookFormData = {
  subscriberUrl: string;
  active: boolean;
  eventTriggers: WebhookTriggerEvents[];
  secret?: string;
  payloadTemplate: string | undefined;
};

const WebhookForm = (props: { webhook?: TWebhook; appId?: string; onSubmit: (event) => void }) => {
  const { t } = useLocale();

  const triggerOptions = !props.appId
    ? WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP_V2()["core"]
    : WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP_V2()[
        props.appId as keyof typeof WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP_V2
      ];

  const formMethods = useForm({
    defaultValues: {
      subscriberUrl: props?.webhook?.subscriberUrl || "",
      active: props?.webhook?.active || Boolean(true),
      eventTriggers: props?.webhook?.eventTriggers || [],
      secret: props?.webhook?.secret || "",
      payloadTemplate: props?.webhook?.payloadTemplate || undefined,
    },
  });

  const [useCustomTemplate, setUseCustomTemplate] = useState(false);

  return (
    <>
      <Form form={formMethods} handleSubmit={(values) => props.onSubmit(values)}>
        <Controller
          name="subscriberUrl"
          control={formMethods.control}
          render={({ field: { value } }) => (
            <>
              <TextField
                name="subscriberUrl"
                label={t("subscriber_url")}
                labelClassName="font-medium text-gray-900 font-sm"
                value={value}
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
            <div className="font-sm mt-8 font-medium text-gray-900">
              <Switch
                label={t("enable_webhook")}
                defaultChecked={props?.webhook?.active || true}
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
          render={({ field: { value } }) => (
            <div className="mt-8">
              <Label className="font-sm mt-8 font-medium text-gray-900">
                <>{t("event_triggers")}</>
              </Label>
              <Select
                options={triggerOptions}
                isMulti
                onChange={(event) => {
                  formMethods.setValue(
                    "eventTriggers",
                    event.map((selection) => selection.value)
                  );
                }}
              />
            </div>
          )}
        />
        <Controller
          name="secret"
          control={formMethods.control}
          render={({ field: { value } }) => (
            <div className="mt-8 ">
              <TextField
                name="secret"
                label={t("secret")}
                labelClassName="font-medium text-gray-900 font-sm"
                value={value}
                onChange={(e) => {
                  formMethods.setValue("secret", e?.target.value);
                }}
              />
            </div>
          )}
        />

        <Controller
          name="payloadTemplate"
          control={formMethods.control}
          render={({ field: { value } }) => (
            <>
              <Label className="font-sm mt-8 text-gray-900">
                <>{t("event_triggers")}</>
              </Label>
              <div className="flex rounded-md border">
                <div
                  className={classNames(
                    "px-1/2 w-1/2 rounded-md  py-2.5 text-center font-medium text-gray-900",
                    !useCustomTemplate && "bg-gray-200"
                  )}
                  onClick={() => {
                    setUseCustomTemplate(false);
                    formMethods.setValue("payloadTemplate", undefined);
                  }}>
                  <p>{t("default")}</p>
                </div>
                <div
                  className={classNames(
                    "px-1/2 w-1/2 rounded-md  py-2.5 text-center font-medium text-gray-900",
                    useCustomTemplate && "bg-gray-200"
                  )}
                  onClick={() => setUseCustomTemplate(true)}>
                  <p>{t("custom")}</p>
                </div>
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
        <div className="mt-8">
          <p className="font-medium text-black">{t("webhook_test")}</p>
          <p className="font-sm mb-4 text-gray-600">{t("test_webhook")}</p>
          <WebhookTestDisclosure />
        </div>

        <div className="mt-12 flex place-content-end space-x-4">
          <Button type="button" color="minimal" href={`${WEBAPP_URL}/v2/settings/developer/webhooks`}>
            {t("cancel")}
          </Button>
          <Button type="submit" loading={formMethods.formState.isSubmitting}>
            {t("create")}
          </Button>
        </div>
      </Form>
    </>
  );
};

export default WebhookForm;
