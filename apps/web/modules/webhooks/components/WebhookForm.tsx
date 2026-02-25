"use client";

import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import customTemplate, { hasTemplateIntegration } from "@calcom/features/webhooks/lib/integrationTemplate";
import { WebhookVersion } from "@calcom/features/webhooks/lib/interface/IWebhookRepository";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { TimeUnit, WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Form } from "@calcom/ui/components/form";
import { Button } from "@coss/ui/components/button";
import { Card, CardFrameFooter, CardPanel } from "@coss/ui/components/card";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@coss/ui/components/collapsible";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxClear,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxValue,
} from "@coss/ui/components/combobox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@coss/ui/components/field";
import { Group, GroupSeparator } from "@coss/ui/components/group";
import { Input } from "@coss/ui/components/input";
import { NumberField, NumberFieldGroup, NumberFieldInput } from "@coss/ui/components/number-field";
import { ScrollArea } from "@coss/ui/components/scroll-area";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@coss/ui/components/select";
import { Spinner } from "@coss/ui/components/spinner";
import { Switch } from "@coss/ui/components/switch";
import { Textarea } from "@coss/ui/components/textarea";
import { ExternalLinkIcon, TrashIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
  version: WebhookVersion;
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
    { value: WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT, label: "wrong_assignment_report" },
  ],
  "routing-forms": [
    { value: WebhookTriggerEvents.FORM_SUBMITTED, label: "form_submitted" },
    { value: WebhookTriggerEvents.FORM_SUBMITTED_NO_EVENT, label: "form_submitted_no_event" },
    { value: WebhookTriggerEvents.ROUTING_FORM_FALLBACK_HIT, label: "routing_form_fallback_hit_trigger" },
  ],
} as const;

function getWebhookVariables(t: (key: string) => string) {
  return [
    {
      category: t("webhook_event_and_booking"),
      variables: [
        {
          name: "triggerEvent",
          variable: "{{triggerEvent}}",
          type: "String",
          description: t("webhook_trigger_event"),
        },
        {
          name: "createdAt",
          variable: "{{createdAt}}",
          type: "Datetime",
          description: t("webhook_created_at"),
        },
        { name: "type", variable: "{{type}}", type: "String", description: t("webhook_type") },
        { name: "title", variable: "{{title}}", type: "String", description: t("webhook_title") },
        {
          name: "startTime",
          variable: "{{startTime}}",
          type: "Datetime",
          description: t("webhook_start_time"),
        },
        {
          name: "endTime",
          variable: "{{endTime}}",
          type: "Datetime",
          description: t("webhook_end_time"),
        },
        {
          name: "description",
          variable: "{{description}}",
          type: "String",
          description: t("webhook_description"),
        },
        {
          name: "location",
          variable: "{{location}}",
          type: "String",
          description: t("webhook_location"),
        },
        { name: "uid", variable: "{{uid}}", type: "String", description: t("webhook_uid") },
        {
          name: "rescheduleUid",
          variable: "{{rescheduleUid}}",
          type: "String",
          description: t("webhook_reschedule_uid"),
        },
        {
          name: "cancellationReason",
          variable: "{{cancellationReason}}",
          type: "String",
          description: t("webhook_cancellation_reason"),
        },
        {
          name: "rejectionReason",
          variable: "{{rejectionReason}}",
          type: "String",
          description: t("webhook_rejection_reason"),
        },
      ],
    },
    {
      category: t("webhook_people"),
      variables: [
        {
          name: "organizer.name",
          variable: "{{organizer.name}}",
          type: "String",
          description: t("webhook_organizer_name"),
        },
        {
          name: "organizer.email",
          variable: "{{organizer.email}}",
          type: "String",
          description: t("webhook_organizer_email"),
        },
        {
          name: "organizer.timezone",
          variable: "{{organizer.timezone}}",
          type: "String",
          description: t("webhook_organizer_timezone"),
        },
        {
          name: "organizer.language.locale",
          variable: "{{organizer.language.locale}}",
          type: "String",
          description: t("webhook_organizer_locale"),
        },
        {
          name: "organizer.username",
          variable: "{{organizer.username}}",
          type: "String",
          description: t("webhook_organizer_username"),
        },
        {
          name: "organizer.usernameInOrg",
          variable: "{{organizer.usernameInOrg}}",
          type: "String",
          description: t("webhook_organizer_username_in_org"),
        },
        {
          name: "attendees.0.name",
          variable: "{{attendees.0.name}}",
          type: "String",
          description: t("webhook_attendee_name"),
        },
        {
          name: "attendees.0.email",
          variable: "{{attendees.0.email}}",
          type: "String",
          description: t("webhook_attendee_email"),
        },
        {
          name: "attendees.0.timeZone",
          variable: "{{attendees.0.timeZone}}",
          type: "String",
          description: t("webhook_attendee_timezone"),
        },
        {
          name: "attendees.0.language.locale",
          variable: "{{attendees.0.language.locale}}",
          type: "String",
          description: t("webhook_attendee_locale"),
        },
      ],
    },
    {
      category: t("webhook_teams"),
      variables: [
        {
          name: "team.name",
          variable: "{{team.name}}",
          type: "String",
          description: t("webhook_team_name"),
        },
        {
          name: "team.members",
          variable: "{{team.members}}",
          type: "String[]",
          description: t("webhook_team_members"),
        },
      ],
    },
    {
      category: t("webhook_metadata"),
      variables: [
        {
          name: "metadata.videoCallUrl",
          variable: "{{metadata.videoCallUrl}}",
          type: "String",
          description: t("webhook_video_call_url"),
        },
      ],
    },
  ];
}

export type WebhookFormValues = {
  subscriberUrl: string;
  active: boolean;
  eventTriggers: WebhookTriggerEvents[];
  secret: string | null;
  payloadTemplate: string | undefined | null;
  time?: number | null;
  timeUnit?: TimeUnit | null;
  version: WebhookVersion;
};

const WebhookForm = (props: {
  webhook?: TWebhook | WebhookFormData;
  apps?: (keyof typeof WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP_V2)[];
  overrideTriggerOptions?: (typeof WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP_V2)["core"];
  onSubmit: (event: WebhookFormSubmitData) => void;
  onCancel?: () => void;
  noRoutingFormTriggers: boolean;
  selectOnlyInstantMeetingOption?: boolean;
  headerWrapper?: (
    formMethods: ReturnType<typeof useForm<WebhookFormValues>>,
    children: React.ReactNode
  ) => React.ReactNode;
}) => {
  const { apps = [], selectOnlyInstantMeetingOption = false, overrideTriggerOptions } = props;
  const { t } = useLocale();
  const webhookVariables = getWebhookVariables(t);

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

  const formMethods = useForm<WebhookFormValues>({
    defaultValues: {
      subscriberUrl: props.webhook?.subscriberUrl || "",
      active: props.webhook ? props.webhook.active : true,
      eventTriggers: getEventTriggers(),
      secret: props?.webhook?.secret || "",
      payloadTemplate: props?.webhook?.payloadTemplate || undefined,
      timeUnit: props?.webhook?.timeUnit || undefined,
      time: props?.webhook?.time || undefined,
      version: props?.webhook?.version || WebhookVersion.V_2021_10_20,
    },
  });

  const triggers = formMethods.watch("eventTriggers") || [];
  const subscriberUrl = formMethods.watch("subscriberUrl");
  const time = formMethods.watch("time");
  const timeUnit = formMethods.watch("timeUnit");

  const TIME_UNITS = [TimeUnit.MINUTE, TimeUnit.HOUR, TimeUnit.DAY] as const;
  const timeUnitItems = TIME_UNITS.map((unit) => ({
    value: unit,
    label: t(`${unit.toLowerCase()}_timeUnit`),
  }));
  const selectedTimeUnitItem =
    timeUnitItems.find((item) => item.value === timeUnit) ?? timeUnitItems[2];

  const isCreating = !props?.webhook?.id;
  const needsTime = triggers.some(
    (t) =>
      t === WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW ||
      t === WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW
  );
  const hasTime = !!time && !!timeUnit;
  const hasUrl = !!subscriberUrl;
  const showTimeSection = needsTime;

  function insertVariableIntoTemplate(current: string, name: string, value: string): string {
    try {
      const parsed = JSON.parse(current || "{}");
      parsed[name] = value;
      return JSON.stringify(parsed, null, 2);
    } catch {
      const trimmed = current.trim();
      if (trimmed === "{}" || trimmed === "") {
        return `{\n  "${name}": "${value}"\n}`;
      }

      if (trimmed.endsWith("}")) {
        const withoutClosing = trimmed.slice(0, -1);
        const needsComma = withoutClosing.trim().endsWith('"') || withoutClosing.trim().endsWith("}");
        return `${withoutClosing}${needsComma ? "," : ""}\n  "${name}": "${value}"\n}`;
      }

      return `${current}\n"${name}": "${value}"`;
    }
  }

  const [customPayloadOpen, setCustomPayloadOpen] = useState(
    props?.webhook?.payloadTemplate !== undefined && props?.webhook?.payloadTemplate !== null
  );
  const [showVariables, setShowVariables] = useState(false);
  const [newSecret, setNewSecret] = useState("");
  const [changeSecret, setChangeSecret] = useState<boolean>(false);
  const hasSecretKey = !!props?.webhook?.secret;

  const canSubmit = isCreating
    ? hasUrl && triggers.length > 0 && (!needsTime || hasTime)
    : formMethods.formState.isDirty || changeSecret;

  useEffect(() => {
    if (isCreating && needsTime && !time && !timeUnit) {
      formMethods.setValue("time", 5, { shouldDirty: true });
      formMethods.setValue("timeUnit", TimeUnit.MINUTE, { shouldDirty: true });
    }
  }, [isCreating, needsTime, time, timeUnit, formMethods]);

  useEffect(() => {
    if (changeSecret) {
      formMethods.unregister("secret", { keepDefaultValue: false });
    }
  }, [changeSecret, formMethods]);

  const formFields = (
    <div className="flex flex-col gap-6">
      <Controller
        name="subscriberUrl"
        control={formMethods.control}
        rules={{
          required: t("subscriber_url_required", "Subscriber URL is required"),
        }}
        render={({
          field: { ref, name, value, onBlur, onChange },
          fieldState: { invalid, isTouched, isDirty, error },
        }) => (
          <Field
            name={name}
            invalid={invalid}
            touched={isTouched}
            dirty={isDirty}>
            <FieldLabel>{t("subscriber_url")}</FieldLabel>
            <Input
              ref={ref}
              placeholder="https://example.com/webhook"
              type="url"
              value={value}
              required
              onBlur={onBlur}
              onValueChange={(urlValue) => {
                onChange(urlValue);
                if (urlValue && hasTemplateIntegration({ url: urlValue })) {
                  setCustomPayloadOpen(true);
                  formMethods.setValue("payloadTemplate", customTemplate({ url: urlValue }), {
                    shouldDirty: true,
                  });
                }
              }}
            />
            <FieldError match={!!error}>{error?.message}</FieldError>
          </Field>
        )}
      />
      <Controller
        name="active"
        control={formMethods.control}
        render={({
          field: { name, value, onChange },
          fieldState: { invalid, isTouched, isDirty },
        }) => (
          <Field name={name} invalid={invalid} touched={isTouched} dirty={isDirty}>
            <FieldLabel>
              <Switch checked={value} onCheckedChange={(checked) => onChange(checked)} />
              {t("enable_webhook")}
            </FieldLabel>
          </Field>
        )}
      />
      <Controller
        name="eventTriggers"
        control={formMethods.control}
        render={({
          field: { name, onChange, value },
          fieldState: { invalid, isTouched, isDirty },
        }) => {
          const selectedItems = translatedTriggerOptions.filter((option) => value.includes(option.value));
          return (
            <Field name={name} invalid={invalid} touched={isTouched} dirty={isDirty}>
              <FieldLabel>{t("event_triggers")}</FieldLabel>
              <Combobox
                value={selectedItems}
                onValueChange={(newValue) => {
                  onChange(newValue.map((item) => item.value));
                  const noShowWebhookTriggerExists = !!newValue.find(
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
                }}
                items={translatedTriggerOptions}
                multiple>
                <ComboboxChips>
                  <ComboboxValue>
                    {(selectedValues: { value: WebhookTriggerEvents; label: string }[]) => (
                      <>
                        {selectedValues?.map((item) => (
                          <ComboboxChip
                            key={item.value}
                            removeProps={{ "aria-label": `${t("remove")} ${item.label}` }}
                          >
                            {item.label}
                          </ComboboxChip>
                        ))}
                        <ComboboxChipsInput
                          aria-label={t("event_triggers")}
                          placeholder={
                            selectedValues.length > 0
                              ? undefined
                              : t("select_event_triggers", "Select event triggers…")
                          }
                        />
                      </>
                    )}
                  </ComboboxValue>
                </ComboboxChips>
                <ComboboxPopup>
                  <ComboboxEmpty>{t("no_options_available")}</ComboboxEmpty>
                  <ComboboxList>
                    {(item: { value: WebhookTriggerEvents; label: string }) => (
                      <ComboboxItem key={item.value} value={item}>
                        {item.label}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxPopup>
                <ComboboxClear render={<Button size="xs" variant="outline" />}>
                  <TrashIcon />
                  {t("clear_all_triggers", "Clear all triggers")}
                </ComboboxClear>
              </Combobox>
            </Field>
          );
        }}
      />

      {showTimeSection && (
        <Controller
          name="time"
          control={formMethods.control}
          render={({
            field: { value: timeValue, onChange: onTimeChange },
            fieldState: { invalid: timeInvalid, isTouched: timeTouched, isDirty: timeDirty },
          }) => (
            <Controller
              name="timeUnit"
              control={formMethods.control}
              render={({
                field: { name, onChange: onTimeUnitChange },
                fieldState: { invalid, isTouched, isDirty },
              }) => (
                <Field
                  name={name}
                  invalid={invalid || timeInvalid}
                  touched={isTouched || timeTouched}
                  dirty={isDirty || timeDirty}>
                  <FieldLabel>{t("how_long_after_user_no_show_minutes")}</FieldLabel>
                  <Group
                    aria-label={t("how_long_after_user_no_show_minutes")}
                    className="w-full">
                    <NumberField
                      aria-label="Duration"
                      className="gap-0"
                      value={timeValue ?? 5}
                      min={0}
                      onValueChange={(newValue) => onTimeChange(newValue ?? 5)}
                      render={<NumberFieldGroup />}>
                      <NumberFieldInput className="text-left" />
                    </NumberField>
                    <GroupSeparator />
                    <Select
                      value={selectedTimeUnitItem}
                      onValueChange={(newValue) => {
                        if (!newValue) return;
                        onTimeUnitChange(newValue.value);
                      }}
                      items={timeUnitItems}>
                      <SelectTrigger className="w-fit min-w-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        {timeUnitItems.map((item) => (
                          <SelectItem key={item.value} value={item}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  </Group>
                </Field>
              )}
            />
          )}
        />
      )}

      <Controller
        name="secret"
        control={formMethods.control}
        render={({
          field: { name, value, onChange },
          fieldState: { invalid, isTouched, isDirty },
        }) => (
          <Field name={name} invalid={invalid} touched={isTouched} dirty={isDirty}>
            {hasSecretKey ? (
              <>
                <FieldLabel>{t("secret")}</FieldLabel>
                <div className="flex w-full gap-2">
                  <Input
                    autoComplete="off"
                    type={changeSecret ? "text" : "password"}
                    value={changeSecret ? newSecret : "••••••••••••"}
                    readOnly={!changeSecret}
                    disabled={!changeSecret}
                    onValueChange={
                      changeSecret
                        ? (v) => {
                          setNewSecret(v);
                          onChange(v);
                        }
                        : undefined
                    }
                    placeholder={changeSecret ? t("leave_blank_to_remove_secret") : undefined}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (changeSecret) {
                        setChangeSecret(false);
                        setNewSecret("");
                      } else {
                        const currentSecret = value || props?.webhook?.secret || "";
                        setNewSecret(currentSecret);
                        setChangeSecret(true);
                      }
                    }}>
                    {changeSecret ? t("cancel") : t("edit")}
                  </Button>
                </div>
                <FieldDescription>{t("forgotten_secret_description")}</FieldDescription>
              </>
            ) : (
              <>
                <FieldLabel>{t("secret")}</FieldLabel>
                <Input
                  type="text"
                  value={value ?? ""}
                  onValueChange={onChange}
                />
              </>
            )}
          </Field>
        )}
      />

      <Controller
        name="payloadTemplate"
        control={formMethods.control}
        render={({
          field: { name, value, onChange },
          fieldState: { invalid, isTouched, isDirty },
        }) => {
          // Flatten webhookVariables into a single array for payloadVariables
          const payloadVariables = webhookVariables.flatMap(({ variables }) =>
            variables.map(({ name: n, variable, description }) => ({
              name: n,
              variable: `{{${variable}}}`,
              description,
            }))
          );

          return (
            <Collapsible onOpenChange={setCustomPayloadOpen} open={customPayloadOpen}>
              <Field name={name} invalid={invalid} touched={isTouched} dirty={isDirty}>
                <FieldLabel>
                  <CollapsibleTrigger
                    nativeButton={false}
                    render={
                      <Switch
                        checked={customPayloadOpen}
                        onCheckedChange={(checked) => {
                          setCustomPayloadOpen(checked);
                          if (!checked) onChange(undefined);
                        }}
                      />
                    }
                  />
                  {t("custom_payload_template", "Custom Payload Template")}
                </FieldLabel>
              </Field>
              <CollapsiblePanel className="-mx-1">
                <div className="px-1 mt-4 flex flex-col items-start gap-2">
                  <Textarea
                    className="font-mono"
                    placeholder={"{\n  \n}"}
                    rows={4}
                    value={value || ""}
                    onChange={(e) => onChange(e?.target?.value ?? "")}
                  />
                  <Collapsible className="w-full" onOpenChange={setShowVariables} open={showVariables}>
                    <CollapsibleTrigger
                      render={
                        <Button size="sm" variant="outline">
                          {showVariables
                            ? t("webhook_hide_variables", "Hide available variables")
                            : t("webhook_show_variable", "Show available variables")}
                        </Button>
                      }
                    />
                    <CollapsiblePanel>
                      <ScrollArea
                        className="mt-4 h-64 rounded-lg border border-input"
                        scrollbarGutter
                        scrollFade>
                        <div className="p-2">
                          {webhookVariables.map(({ category, variables }) => (
                            <div key={category}>
                              <p className="my-1 px-[calc(--spacing(2)+1px)] font-medium text-sm">
                                {category}
                              </p>
                              <ul>
                                {variables.map(({ name, variable, description }) => (
                                  <li key={name}>
                                    <Button
                                      className="h-auto! w-full flex-col items-start gap-0.5 px-2 py-1.5 text-left"
                                      variant="ghost"
                                      onClick={() => {
                                        const currentValue = formMethods.getValues("payloadTemplate") || "{}";
                                        const updatedValue = insertVariableIntoTemplate(
                                          currentValue,
                                          name,
                                          variable
                                        );
                                        onChange(updatedValue);
                                      }}>
                                      <span className="font-mono text-xs">{variable}</span>
                                      <span className="font-normal text-muted-foreground text-xs">
                                        {description}
                                      </span>
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CollapsiblePanel>
                  </Collapsible>
                </div>
              </CollapsiblePanel>
            </Collapsible>
          );
        }}
      />
    </div>
  );

  const cancelButton = props.onCancel ? (
    <Button type="button" variant="ghost" onClick={props.onCancel}>
      {t("cancel")}
    </Button>
  ) : (
    <Button type="button" variant="ghost" render={<Link href="/settings/developer/webhooks" />}>
      {t("cancel")}
    </Button>
  );

  const submitButton = (
    <Button
      type="submit"
      data-testid="create_webhook"
      disabled={!canSubmit || formMethods.formState.isSubmitting}>
      {formMethods.formState.isSubmitting && <Spinner className="absolute" />}
      <span className={formMethods.formState.isSubmitting ? "invisible" : undefined}>
        {props?.webhook?.id ? t("save") : t("create_webhook")}
      </span>
    </Button>
  );

  if (props.headerWrapper) {
    const cardContent = (
      <>
        <Card className="rounded-b-none!">
          <CardPanel>{formFields}</CardPanel>
        </Card>
        <CardFrameFooter className="flex justify-end gap-2">
          {cancelButton}
          {submitButton}
        </CardFrameFooter>
      </>
    );

    return (
      <Form
        form={formMethods}
        handleSubmit={(values) => props.onSubmit({ ...values, changeSecret, newSecret })}>
        <div className="flex flex-col gap-4">
          {props.headerWrapper(formMethods, cardContent)}
          <WebhookTestDisclosure />
        </div>
      </Form>
    );
  }

  return (
    <Form
      form={formMethods}
      handleSubmit={(values) => props.onSubmit({ ...values, changeSecret, newSecret })}>
      {formFields}
      <SectionBottomActions align="end" className="gap-2">
        {cancelButton}
        {submitButton}
      </SectionBottomActions>
      <div className="mb-4 mt-6 rounded-md">
        <WebhookTestDisclosure />
      </div>
    </Form>
  );
};

export default WebhookForm;
