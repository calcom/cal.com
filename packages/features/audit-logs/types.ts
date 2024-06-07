import { z } from "zod";

import type { AppKeys } from "@calcom/app-store/templates/audit-log-implementation/zod";
import { AuditLogTriggerTargets } from "@calcom/prisma/enums";
import type { IconName } from "@calcom/ui";

export interface AuditLogsManager {
  reportEvent(event: AuditLogEvent): Promise<string | undefined | void>;
}

export enum CRUD {
  CREATE = "c",
  DELETE = "d",
  UPDATE = "u",
  READ = "r",
}

export function getValues<T extends Record<string, any>>(obj: T) {
  return Object.values(obj) as [(typeof obj)[keyof T]];
}

export const AuditLogTriggerEventsBooking = {
  BOOKING_CREATED: "BOOKING_CREATED",
  BOOKING_MODIFIED: "BOOKING_MODIFIED",
  BOOKING_RESCHEDULED: "BOOKING_RESCHEDULED",
  BOOKING_REQUESTED: "BOOKING_REQUESTED",
  BOOKING_CANCELLED: "BOOKING_CANCELLED",
  BOOKING_REJECTED: "BOOKING_REJECTED",
  BOOKING_PAYMENT_INITIATED: "BOOKING_PAYMENT_INITIATED",
  BOOKING_PAID: "BOOKING_PAID",
  BOOKING_CONFIRMED: "BOOKING_CONFIRMED",
} as const;

export const AuditLogTriggerEventsAdmin = {
  updateAppCredentials: "APP_CREDENTIALS_UPDATED",
} as const;

export const AuditLogTriggerEvents = {
  ...AuditLogTriggerEventsAdmin,
  ...AuditLogTriggerEventsBooking,
};

export enum DefaultAppSettingsOptions {
  "CREDENTIALS" = "credentials",
  "TRIGGERS" = "triggers",
  "GENERAL" = "general",
}

export type DefaultAppSettingOptionEntry = {
  key: DefaultAppSettingsOptions;
  name: string;
  href: string;
  icon: IconName;
};

export interface GeneralSettingsOption {
  name: string;
  description: string;
  button: string;
  component?: (option: any) => JSX.Element;
  toggle?: boolean;
}

export type GenericAuditLogClient = {
  credentials: AppKeys;
  reportEvent: (event: AuditLogEvent) => void;
};

export const ZAuditLogEventBase = z.object({
  action: z.string(),
  crud: z.nativeEnum(CRUD),
  actor: z.object({
    id: z.string(),
    name: z.string().optional(),
    fields: z.object({}).passthrough().optional(),
  }),
  target: z.object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    fields: z.object({}).passthrough().optional(),
  }),
  description: z.string().optional(),
  is_failure: z.boolean().optional(),
  is_anonymous: z.boolean().optional(),
  fields: z.object({}).passthrough().optional(),
});

export type AuditLogEvent = z.infer<typeof ZAuditLogEventBase>;

function getRetracedStringParser(message: string) {
  return z.coerce
    .string()
    .trim()
    .transform((value) => (value.length <= 1 ? message : value));
}

const bookingActorFields = z.object({
  additionalNotes: getRetracedStringParser("Not provided."),
  email: getRetracedStringParser("Not provided"),
});

const bookingTargerFields = z.object({
  email: getRetracedStringParser("Not provided."),
  username: getRetracedStringParser("Not provided."),
  name: getRetracedStringParser("Not provided."),
  timezone: getRetracedStringParser("Not provided."),
});

const bookingEventFields = z.object({
  title: getRetracedStringParser("Not provided."),
  bookerUrl: getRetracedStringParser("Not provided."),
  startTime: getRetracedStringParser("Not provided."),
  endTime: getRetracedStringParser("Not provided."),
  bookingType: getRetracedStringParser("Not provided."),
  bookingTypeId: getRetracedStringParser("Not provided."),
  description: getRetracedStringParser("Not provided."),
  location: getRetracedStringParser("Not provided."),
  conferenceCredentialId: getRetracedStringParser("Not provided."),
  iCalUID: getRetracedStringParser("Not provided."),
  eventTitle: getRetracedStringParser("Not provided."),
  length: getRetracedStringParser("Not provided."),
  bookingId: getRetracedStringParser("Not provided."),
  status: getRetracedStringParser("Not provided."),
  smsReminderNumber: getRetracedStringParser("Not provided."),
  rejectionReason: getRetracedStringParser("Not provided."),
});

export function getEventSchema(
  actorFieldsSchema: z.ZodObject<any>,
  targetFieldsSchema: z.ZodObject<any>,
  eventFieldsSchema: z.ZodObject<any>
) {
  return z.object({
    action: z.string(),
    crud: z.nativeEnum(CRUD),
    actor: z.object({
      id: z.string(),
      name: z.string().optional(),
      fields: actorFieldsSchema,
    }),
    target: z.object({
      id: z.string(),
      name: z.string().optional(),
      type: z.string().optional(),
      fields: targetFieldsSchema,
    }),
    description: z.string().optional(),
    is_failure: z.boolean().optional(),
    is_anonymous: z.boolean().optional(),
    fields: eventFieldsSchema,
  });
}

export const bookingSchemaGenerated = getEventSchema(
  bookingActorFields,
  bookingTargerFields,
  bookingEventFields
);

// TODO: delete
const bookingsSchema = z.object({
  crud: z.nativeEnum(CRUD),
  action: z.enum(getValues(AuditLogTriggerEvents)),
  description: getRetracedStringParser("No description provided"),
  actor: z.object({
    id: getRetracedStringParser("-1"),
    name: getRetracedStringParser("Not provided."),
    fields: z.object({
      additionalNotes: getRetracedStringParser("Not provided."),
      email: getRetracedStringParser("Not provided"),
    }),
  }),
  target: z.object({
    id: getRetracedStringParser("Not found."),
    name: getRetracedStringParser("No host name."),
    fields: z.object({
      email: getRetracedStringParser("Not provided."),
      username: getRetracedStringParser("Not provided."),
      name: getRetracedStringParser("Not provided."),
      timezone: getRetracedStringParser("Not provided."),
    }),
    type: z.enum(getValues(AuditLogTriggerTargets)),
  }),
  fields: z.object({
    title: getRetracedStringParser("Not provided."),
    bookerUrl: getRetracedStringParser("Not provided."),
    startTime: getRetracedStringParser("Not provided."),
    endTime: getRetracedStringParser("Not provided."),
    bookingType: getRetracedStringParser("Not provided."),
    bookingTypeId: getRetracedStringParser("Not provided."),
    description: getRetracedStringParser("Not provided."),
    location: getRetracedStringParser("Not provided."),
    conferenceCredentialId: getRetracedStringParser("Not provided."),
    iCalUID: getRetracedStringParser("Not provided."),
    eventTitle: getRetracedStringParser("Not provided."),
    length: getRetracedStringParser("Not provided."),
    bookingId: getRetracedStringParser("Not provided."),
    status: getRetracedStringParser("Not provided."),
    smsReminderNumber: getRetracedStringParser("Not provided."),
    rejectionReason: getRetracedStringParser("Not provided."),
  }),
  is_anonymous: z.boolean(),
  is_failure: z.boolean(),
  group: z.object({
    id: getRetracedStringParser("Not provided."),
    name: getRetracedStringParser("Not provided."),
  }),
  created: z.date(),
  source_ip: z
    .string()
    .trim()
    .transform((value) => (value.length <= 1 ? "Not provided." : value)),
});
