import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import { WebhookVersion } from "./interface/IWebhookRepository";

// this is exported as we can't use `WebhookTriggerEvents` in the frontend straight-off

/**
 * Version label map - transforms version enum values to display labels.
 * Since our version values ARE date strings (e.g., "2021-10-20"), labels match values.
 * This map allows for custom labels if needed in the future.
 */
export const WEBHOOK_VERSION_LABELS: Record<WebhookVersion, string> = {
  [WebhookVersion.V_2021_10_20]: "2021-10-20",
  // Add new versions here: [WebhookVersion.V_YYYY_MM_DD]: "YYYY-MM-DD",
};

/**
 * Pre-built options for Select components - automatically generated from all versions
 */
export const WEBHOOK_VERSION_OPTIONS = Object.values(WebhookVersion).map((version) => ({
  value: version,
  label: WEBHOOK_VERSION_LABELS[version] ?? version,
}));

/**
 * Get display label for a version
 */
export const getWebhookVersionLabel = (version: WebhookVersion): string =>
  WEBHOOK_VERSION_LABELS[version] ?? version;

export const WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP = {
  core: [
    WebhookTriggerEvents.BOOKING_CANCELLED,
    WebhookTriggerEvents.BOOKING_CREATED,
    WebhookTriggerEvents.BOOKING_RESCHEDULED,
    WebhookTriggerEvents.BOOKING_PAID,
    WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED,
    WebhookTriggerEvents.MEETING_ENDED,
    WebhookTriggerEvents.MEETING_STARTED,
    WebhookTriggerEvents.BOOKING_REQUESTED,
    WebhookTriggerEvents.BOOKING_REJECTED,
    WebhookTriggerEvents.RECORDING_READY,
    WebhookTriggerEvents.INSTANT_MEETING,
    WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED,
    WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
    WebhookTriggerEvents.OOO_CREATED,
    WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
    WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
    WebhookTriggerEvents.DELEGATION_CREDENTIAL_ERROR,
  ] as const,
  "routing-forms": [
    WebhookTriggerEvents.FORM_SUBMITTED,
    WebhookTriggerEvents.FORM_SUBMITTED_NO_EVENT,
  ] as const,
};

export const WEBHOOK_TRIGGER_EVENTS = [
  ...WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP.core,
  ...WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP["routing-forms"],
] as const;
