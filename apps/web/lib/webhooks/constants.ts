import { WebhookTriggerEvents } from "@prisma/client";

import { useLocale } from "@calcom/lib/hooks/useLocale";

// this is exported as we can't use `WebhookTriggerEvents` in the frontend straight-off

export const WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP = {
  core: [
    WebhookTriggerEvents.BOOKING_CANCELLED,
    WebhookTriggerEvents.BOOKING_CREATED,
    WebhookTriggerEvents.BOOKING_RESCHEDULED,
    WebhookTriggerEvents.MEETING_ENDED,
  ] as const,
  routing_forms: [WebhookTriggerEvents.FORM_SUBMITTED] as ["FORM_SUBMITTED"],
};

export const WEBHOOK_TRIGGER_EVENTS = [
  ...WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP.core,
  ...WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP.routing_forms,
] as const;

export const WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP_V2 = () => {
  const { t } = useLocale();
  return {
    core: [
      { value: WebhookTriggerEvents.BOOKING_CANCELLED, label: t("booking_cancelled") },
      { value: WebhookTriggerEvents.BOOKING_CREATED, label: t("booking_created") },
      { value: WebhookTriggerEvents.BOOKING_RESCHEDULED, label: t("booking_rescheduled") },
      { value: WebhookTriggerEvents.MEETING_ENDED, label: t("meeting_ended") },
    ],
    routing_forms: [{ value: WebhookTriggerEvents.FORM_SUBMITTED, label: t("form_submitted") }],
  };
};
