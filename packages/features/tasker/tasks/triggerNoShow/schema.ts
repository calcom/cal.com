import { z } from "zod";

import { TIME_UNIT, WORKFLOW_ACTIONS } from "@calcom/features/ee/workflows/lib/constants";
import { WEBHOOK_TRIGGER_EVENTS } from "@calcom/features/webhooks/lib/constants";

const commonSchema = z.object({
  roomName: z.string(),
  bookingId: z.number(),
});

export const ZWebhook = z.object({
  id: z.string(),
  subscriberUrl: z.string().url(),
  appId: z.string().nullable(),
  secret: z.string(),
  time: z.number(),
  timeUnit: z.enum(TIME_UNIT),
  eventTriggers: z.array(z.string()),
});

export const sendNoShowWebhookPayloadSchema = z.object({
  roomName: z.string(),
  bookingId: z.number(),
  allNoShowWebhooks: z.array(ZWebhook),
  allNoShowWorkflows: z.array(
    z.object({
      id: z.string(),
      trigger: z.enum(WEBHOOK_TRIGGER_EVENTS),
      time: z.number().optional(),
      timeUnit: z.enum(TIME_UNIT).optional(),
      userId: z.number().optional(),
      teamId: z.number().optional(),
      name: z.string(),
      steps: z.array(
        z.object({
          id: z.string(),
          action: z.enum(WORKFLOW_ACTIONS),
          sendTo: z.string().optional(),
          reminderBody: z.string().optional(),
          emailSubject: z.string().optional(),
          template: z.enum(WORKFLOW_TEMPLATES),
          numberVerificationPending: z.boolean(),
          sender: z.string(),
          includeCalendarEvent: z.boolean(),
          numberRequired: z.boolean().optional(),
        })
      ),
    })
  ),
});

export const TSendNoShowWebhookPayloadSchema = z.infer<typeof sendNoShowWebhookPayloadSchema>;

export const triggerNoShowPayloadSchema = z.object({
  total_count: z.number(),
  data: z.array(
    z
      .object({
        id: z.string(),
        room: z.string(),
        start_time: z.string(),
        duration: z.number(),
        max_participants: z.number(),
        participants: z.array(
          z.object({
            user_id: z.string(),
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

export const TTriggerNoShowPayloadSchema = z.infer<typeof triggerNoShowPayloadSchema>;

export const ZSendNoShowWebhookPayloadSchema = commonSchema.extend({
  webhook: ZWebhook,
});

// export const TSendNoShowWebhookPayloadSchema = z.infer<typeof ZSendNoShowWebhookPayloadSchema>;
