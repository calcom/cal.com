import { useState } from "react";
import { useForm, Controller } from "react-hook-form";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { inferQueryOutput, trpc } from "@calcom/trpc/react";
import Switch from "@calcom/ui/v2/core/Switch";
import Select from "@calcom/ui/v2/core/form/Select";
import { Form, Label, Input, TextField } from "@calcom/ui/v2/core/form/fields";

import { WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP_V2 } from "@lib/webhooks/constants";

export type TWebhook = inferQueryOutput<"viewer.webhook.list">[number];

const WebhookForm = (props: { webhook?: TWebhook; appId?: string }) => {
  const { t } = useLocale();

  const triggerOptions = !props.appId
    ? WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP_V2()["core"]
    : WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP_V2()[
        props.appId as keyof typeof WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP_V2
      ];

  const formMethods = useForm({
    defaultValues: {
      subscriberUrl: props?.webhook?.subscriberUrl || "",
      active: props?.webhook?.active,
      eventTriggers: props?.webhook?.eventTriggers || [],
      payloadTemplate: props?.webhook?.payloadTemplate || null,
    },
  });

  const [customTemplate, setCustomTemplate] = useState(false);

  return (
    <>
      <Form form={formMethods} onSubmit={(values) => console.log("Form submitted", values)}>
        <Controller
          name="subscriberUrl"
          control={formMethods.control}
          render={({ field: { value } }) => (
            <TextField
              name="subscriberUrl"
              label={t("subscriber_url")}
              value={value}
              onChange={(e) => {
                formMethods.setValue("subscriberUrl", e?.target.value);
              }}
            />
          )}
        />
        <Controller
          name="active"
          control={formMethods.control}
          render={({ field: { value } }) => (
            <div className="mt-8">
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
              <Label className="mt-8 text-gray-900">
                <>{t("event_triggers")}</>
              </Label>
              <Select
                options={triggerOptions}
                isMulti
                onChange={(event) => formMethods.setValue("eventTriggers", event)}
              />
            </div>
          )}
        />
        <Controller
          name="eventTriggers"
          control={formMethods.control}
          render={({ field: { value } }) => (
            <div className="mt-8">
              <Label className="mt-8 text-gray-900">
                <>{t("event_triggers")}</>
              </Label>
              <Select
                options={triggerOptions}
                isMulti
                onChange={(event) => formMethods.setValue("eventTriggers", event)}
              />
            </div>
          )}
        />
        <div className="mt-8 flex rounded-md border">
          <div
            className={classNames(
              "px-1/2 w-1/2 rounded-md  py-2.5 text-center font-medium text-gray-900",
              !customTemplate && "bg-gray-200"
            )}
            onClick={() => setCustomTemplate(false)}>
            <p>{t("default")}</p>
          </div>
          <div
            className={classNames(
              "px-1/2 w-1/2 rounded-md  py-2.5 text-center font-medium text-gray-900",
              customTemplate && "bg-gray-200"
            )}
            onClick={() => setCustomTemplate(true)}>
            <p>{t("custom")}</p>
          </div>
        </div>
      </Form>
    </>
  );
};

export default WebhookForm;
