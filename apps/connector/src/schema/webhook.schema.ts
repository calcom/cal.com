import { WebhookTriggerEvents } from "@prisma/client";
import type { Prisma, User, UserPermissionRole, Webhook } from "@calcom/prisma/client";
import { z } from "zod";

import { _AvailabilityModel } from "@calcom/prisma/zod";

export const getWebhookRequestSchema = z.object({
  page: z.number().int().positive().default(1).describe("Page number (default: 1)"),

  limit: z
    .number()
    .int()
    .positive()
    .max(500)
    .default(100)
    .describe("Number of results per page (default: 100)"),
});

export const getWebhooksResponseSchema = z.object({
  payloadTemplate: z.string().nullable().optional(),
  platformOAuthClientId: z.string().nullable().optional(),
  id: z.string(),
  eventTriggers: z.array(z.nativeEnum(WebhookTriggerEvents)), 
  subscriberUrl: z.string(),
  active: z.boolean(),
  secret: z.string().optional().nullable(),
});


export const webhookCreationDtoSchema = z.object({
  payloadTemplate: z.string().optional().nullable(),
  eventTriggers: z.array(z.nativeEnum(WebhookTriggerEvents)).optional(), 
  subscriberUrl: z.string(),
  active: z.boolean().optional(),
  secret: z.string().optional().nullable(),
});

export const webhookUpdationDtoSchema = z.object({
  payloadTemplate: z.string().optional().nullable(),
  eventTriggers: z.array(z.nativeEnum(WebhookTriggerEvents)).optional(), 
  subscriberUrl: z.string().optional(),
  active: z.boolean().optional(),
  secret: z.string().optional().nullable(),
});

export const scheduleBodySchema = z.object({
  name: z.string(),
  timeZone: z.string(),
});


export type WebhookInputData = Pick<
  Webhook,
  "payloadTemplate" | "eventTriggers" | "subscriberUrl" | "secret" | "active"
>;
