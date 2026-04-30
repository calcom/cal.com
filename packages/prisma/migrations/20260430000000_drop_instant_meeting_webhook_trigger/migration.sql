BEGIN;
UPDATE "public"."Webhook"
SET "eventTriggers" = array_remove("eventTriggers", 'INSTANT_MEETING'::"public"."WebhookTriggerEvents")
WHERE "eventTriggers" @> ARRAY['INSTANT_MEETING']::"public"."WebhookTriggerEvents"[];

CREATE TYPE "public"."WebhookTriggerEvents_new" AS ENUM (
  'BOOKING_CREATED',
  'BOOKING_PAYMENT_INITIATED',
  'BOOKING_PAID',
  'BOOKING_RESCHEDULED',
  'BOOKING_REQUESTED',
  'BOOKING_CANCELLED',
  'BOOKING_REJECTED',
  'BOOKING_NO_SHOW_UPDATED',
  'FORM_SUBMITTED',
  'MEETING_ENDED',
  'MEETING_STARTED',
  'RECORDING_READY',
  'RECORDING_TRANSCRIPTION_GENERATED',
  'OOO_CREATED',
  'AFTER_HOSTS_CAL_VIDEO_NO_SHOW',
  'AFTER_GUESTS_CAL_VIDEO_NO_SHOW',
  'FORM_SUBMITTED_NO_EVENT',
  'DELEGATION_CREDENTIAL_ERROR',
  'WRONG_ASSIGNMENT_REPORT'
);
ALTER TABLE "public"."Webhook"
ALTER COLUMN "eventTriggers" TYPE "public"."WebhookTriggerEvents_new"[]
USING ("eventTriggers"::text::"public"."WebhookTriggerEvents_new"[]);
ALTER TYPE "public"."WebhookTriggerEvents" RENAME TO "WebhookTriggerEvents_old";
ALTER TYPE "public"."WebhookTriggerEvents_new" RENAME TO "WebhookTriggerEvents";
DROP TYPE "public"."WebhookTriggerEvents_old";
COMMIT;
