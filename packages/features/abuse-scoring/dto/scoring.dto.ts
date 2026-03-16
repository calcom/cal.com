import { z } from "zod";

import { ABUSE_RULE_FIELDS, ABUSE_RULE_OPERATORS } from "../lib/constants";

const eventTypeForScoringDtoSchema = z.object({
  id: z.number(),
  userId: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  successRedirectUrl: z.string().nullable(),
  forwardParamsSuccessRedirect: z.boolean().nullable(),
});

const bookingForScoringDtoSchema = z.object({
  createdAt: z.date(),
  cancellationReason: z.string().nullable(),
  location: z.string().nullable(),
  responses: z.unknown().nullable(),
  eventType: z.object({ userId: z.number() }).nullable(),
  attendees: z.array(z.object({ email: z.string() })),
});

export const userForScoringDtoSchema = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  locked: z.boolean(),
  abuseScore: z.number(),
  eventTypes: z.array(eventTypeForScoringDtoSchema),
  bookings: z.array(bookingForScoringDtoSchema),
});
export type UserForScoringDto = z.infer<typeof userForScoringDtoSchema>;

export const userForMonitoringDtoSchema = z.object({
  createdDate: z.date(),
  locked: z.boolean(),
});
export type UserForMonitoringDto = z.infer<typeof userForMonitoringDtoSchema>;

const abuseRuleConditionDtoSchema = z.object({
  id: z.string(),
  field: z.enum(ABUSE_RULE_FIELDS),
  operator: z.enum(ABUSE_RULE_OPERATORS),
  value: z.string(),
});

export const abuseRuleGroupDtoSchema = z.object({
  id: z.string(),
  matchAll: z.boolean(),
  weight: z.number(),
  autoLock: z.boolean(),
  description: z.string().nullable(),
  conditions: z.array(abuseRuleConditionDtoSchema),
});
export type AbuseRuleGroupDto = z.infer<typeof abuseRuleGroupDtoSchema>;

export const abuseScoringConfigDtoSchema = z.object({
  alertThreshold: z.number(),
  lockThreshold: z.number(),
  monitoringWindowDays: z.number(),
});
export type AbuseScoringConfigDto = z.infer<typeof abuseScoringConfigDtoSchema>;
