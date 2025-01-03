import { z } from "zod";

import {
  TIME_UNIT,
  WORKFLOW_ACTIONS,
  WORKFLOW_TEMPLATES,
  WORKFLOW_TRIGGER_EVENTS,
} from "@calcom/ee/workflows/lib/constants";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

const commonSchema = z.object({
  triggerEvent: z.enum([
    WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
    WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
  ]),
  bookingId: z.number(),
});

export const ZWebhook = z.object({
  id: z.string(),
  subscriberUrl: z.string().url(),
  appId: z.string().nullable(),
  secret: z.string().nullable(),
  time: z.number(),
  timeUnit: z.enum(TIME_UNIT),
  eventTriggers: z.array(z.string()),
  payloadTemplate: z.string().nullable(),
});

export const ZWorkflow = z.object({
  id: z.number(),
  name: z.string(),
  trigger: z.enum(WORKFLOW_TRIGGER_EVENTS),
  time: z.number().nullable(),
  timeUnit: z.enum(TIME_UNIT).nullable(),
  userId: z.number().nullable(),
  teamId: z.number().nullable(),
  steps: z
    .object({
      id: z.number(),
      action: z.enum(WORKFLOW_ACTIONS),
      sendTo: z.string().nullable(),
      template: z.enum(WORKFLOW_TEMPLATES),
      reminderBody: z.string().nullable(),
      emailSubject: z.string().nullable(),
      numberRequired: z.boolean().nullable(),
      sender: z.string().nullable(),
      includeCalendarEvent: z.boolean(),
      numberVerificationPending: z.boolean(),
    })
    .array(),
});

export type TWorkflow = z.infer<typeof ZWorkflow>;

export type TWebhook = z.infer<typeof ZWebhook>;

export const triggerNoShowPayloadSchema = z.object({
  total_count: z.number(),
  data: z.array(
    z
      .object({
        id: z.string(),
        room: z.string(),
        start_time: z.number(),
        duration: z.number(),
        max_participants: z.number(),
        participants: z.array(
          z.object({
            user_id: z.string().nullable(),
            participant_id: z.string(),
            user_name: z.string(),
            join_time: z.number(),
            duration: z.number(),
          })
        ),
      })
      .passthrough()
  ),
});

export const ZCalendarEvent = z
  .object({
    type: z.string(),
    title: z.string(),
    startTime: z.string(),
    endTime: z.string(),
  })
  .passthrough();

export type TTriggerNoShowPayloadSchema = z.infer<typeof triggerNoShowPayloadSchema>;

export const ZTriggerHostNoShowWorkflowPayloadSchema = commonSchema.extend({
  workflow: ZWorkflow,
  smsReminderNumber: z.string().nullable(),
  emailAttendeeSendToOverride: z.string().nullable(),
  hideBranding: z.boolean().optional(),
  seatReferenceUid: z.string().nullish(),
  calendarEvent: ZCalendarEvent,
});

export const ZTriggerHostNoShowWebhookPayloadSchema = commonSchema.extend({
  webhook: ZWebhook,
  calendarEvent: ZCalendarEvent.nullish(),
});

export const ZSendNoShowWebhookPayloadSchema = z.union([
  ZTriggerHostNoShowWebhookPayloadSchema,
  ZTriggerHostNoShowWorkflowPayloadSchema,
]);
