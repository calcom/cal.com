import { z } from "zod";

import type { AppKeys } from "@calcom/app-store/templates/audit-log-implementation/zod";
import type {
  AuditLogApiKeysTriggerEvents,
  AuditLogAppTriggerEvents,
  AuditLogBookingTriggerEvents,
  AuditLogCredentialTriggerEvents,
  AuditLogWebhookTriggerEvents,
  AuditLogSystemTriggerEvents,
} from "@calcom/prisma/enums";
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

export type AuditLogTriggerEvents =
  | AuditLogApiKeysTriggerEvents
  | AuditLogAppTriggerEvents
  | AuditLogBookingTriggerEvents
  | AuditLogCredentialTriggerEvents
  | AuditLogWebhookTriggerEvents
  | AuditLogSystemTriggerEvents;

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
