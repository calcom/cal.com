import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import Button from "@calcom/ui/Button";
import { DialogFooter } from "@calcom/ui/Dialog";
import Switch from "@calcom/ui/Switch";
import { FieldsetLegend, Form, InputGroupBox, TextArea, TextField } from "@calcom/ui/form/fields";

import { trpc } from "@lib/trpc";
import { WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP } from "@lib/webhooks/constants";
import customTemplate, { hasTemplateIntegration } from "@lib/webhooks/integrationTemplate";

import { TWebhook } from "@components/webhook/WebhookListItem";
import WebhookTestDisclosure from "@components/webhook/WebhookTestDisclosure";

export default function WebhookDialogForm(props: {
  eventTypeId?: number;
  defaultValues?: TWebhook;
  app?: string;
  handleClose: () => void;
}) {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const appId = props.app;

  const triggers = !appId
    ? WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP["core"]
    : WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP[appId as keyof typeof WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP];
  const {
    defaultValues = {
      id: "",
      eventTriggers: triggers,
      subscriberUrl: "",
      active: true,
      payloadTemplate: null,
      secret: null,
    } as Omit<TWebhook, "userId" | "createdAt" | "eventTypeId" | "appId">,
  } = props;

  const [useCustomPayloadTemplate, setUseCustomPayloadTemplate] = useState(!!defaultValues.payloadTemplate);
  const [changeSecret, setChangeSecret] = useState(false);
  const [newSecret, setNewSecret] = useState("");
  const hasSecretKey = !!defaultValues.secret;
  const currentSecret = defaultValues.secret;

  const form = useForm({
    defaultValues,
  });

  const handleInput = (event: React.FormEvent<HTMLInputElement>) => {
    setNewSecret(event.currentTarget.value);
  };

  useEffect(() => {
    if (changeSecret) {
      form.unregister("secret", { keepDefaultValue: false });
    }
  }, [changeSecret]);

  return (
    <Form
      data-testid="WebhookDialogForm"
      form={form}
      handleSubmit={async (event) => {
        const e = changeSecret
          ? { ...event, eventTypeId: props.eventTypeId, appId }
          : { ...event, secret: currentSecret, eventTypeId: props.eventTypeId, appId };
        if (!useCustomPayloadTemplate && event.payloadTemplate) {
          event.payloadTemplate = null;
        }
        if (event.id) {
          await utils.client.mutation("viewer.webhook.edit", e);
          await utils.invalidateQueries(["viewer.webhook.list"]);
          showToast(t("webhook_updated_successfully"), "success");
        } else {
          await utils.client.mutation("viewer.webhook.create", e);
          await utils.invalidateQueries(["viewer.webhook.list"]);
          showToast(t("webhook_created_successfully"), "success");
        }
        props.handleClose();
      }}
      className="space-y-4">
      <div>
        <input type="hidden" {...form.register("id")} />
      </div>
      <fieldset className="space-y-2">
        <InputGroupBox className="border-0 bg-gray-50">
          <Controller
            control={form.control}
            name="active"
            render={({ field }) => (
              <Switch
                label={field.value ? t("webhook_enabled") : t("webhook_disabled")}
                defaultChecked={field.value}
                onCheckedChange={(isChecked) => {
                  form.setValue("active", isChecked);
                }}
              />
            )}
          />
        </InputGroupBox>
      </fieldset>
      <div>
        <TextField
          label={t("subscriber_url")}
          {...form.register("subscriberUrl")}
          required
          type="url"
          onChange={(e) => {
            form.setValue("subscriberUrl", e.target.value);
            if (hasTemplateIntegration({ url: e.target.value })) {
              setUseCustomPayloadTemplate(true);
              form.setValue("payloadTemplate", customTemplate({ url: e.target.value }));
            }
          }}
        />
      </div>
      <fieldset className="space-y-2">
        <FieldsetLegend>{t("event_triggers")}</FieldsetLegend>
        <InputGroupBox className="border-0 bg-gray-50">
          {triggers.map((key) => (
            <Controller
              key={key}
              control={form.control}
              name="eventTriggers"
              render={({ field }) => (
                <Switch
                  label={t(key.toLowerCase())}
                  defaultChecked={field.value.includes(key)}
                  onCheckedChange={(isChecked) => {
                    const value = field.value;
                    const newValue = isChecked ? [...value, key] : value.filter((v) => v !== key);

                    form.setValue("eventTriggers", newValue, {
                      shouldDirty: true,
                    });
                  }}
                />
              )}
            />
          ))}
        </InputGroupBox>
      </fieldset>
      <fieldset className="space-y-2">
        {!!hasSecretKey && !changeSecret && (
          <>
            <FieldsetLegend>{t("secret")}</FieldsetLegend>
            <div className="rounded-sm bg-gray-50 p-2 text-xs text-neutral-900">
              {t("forgotten_secret_description")}
            </div>
            <Button
              color="secondary"
              type="button"
              className="py-1 text-xs"
              onClick={() => {
                setChangeSecret(true);
              }}>
              {t("change_secret")}
            </Button>
          </>
        )}
        {!!hasSecretKey && changeSecret && (
          <>
            <TextField
              autoComplete="off"
              label={t("secret")}
              {...form.register("secret")}
              value={newSecret}
              onChange={handleInput}
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
          <TextField autoComplete="off" label={t("secret")} {...form.register("secret")} type="text" />
        )}
      </fieldset>
      <fieldset className="space-y-2">
        <FieldsetLegend>{t("payload_template")}</FieldsetLegend>
        <div className="space-x-3 text-sm rtl:space-x-reverse">
          <label>
            <input
              className="text-neutral-900 focus:ring-neutral-500"
              type="radio"
              name="useCustomPayloadTemplate"
              onChange={(value) => setUseCustomPayloadTemplate(!value.target.checked)}
              defaultChecked={!useCustomPayloadTemplate}
            />{" "}
            Default
          </label>
          <label>
            <input
              className="text-neutral-900 focus:ring-neutral-500"
              onChange={(value) => setUseCustomPayloadTemplate(value.target.checked)}
              name="useCustomPayloadTemplate"
              type="radio"
              defaultChecked={useCustomPayloadTemplate}
            />{" "}
            Custom
          </label>
        </div>
        {useCustomPayloadTemplate && (
          <TextArea
            {...form.register("payloadTemplate")}
            defaultValue={useCustomPayloadTemplate && (defaultValues.payloadTemplate || "")}
            rows={3}
          />
        )}
      </fieldset>
      <WebhookTestDisclosure />
      <DialogFooter>
        <Button type="button" color="secondary" onClick={props.handleClose} tabIndex={-1}>
          {t("cancel")}
        </Button>
        <Button type="submit" loading={form.formState.isSubmitting}>
          {t("save")}
        </Button>
      </DialogFooter>
    </Form>
  );
}
