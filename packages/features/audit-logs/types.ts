import { z } from "zod";

import type { AppKeys } from "@calcom/app-store/templates/audit-log-implementation/zod";
import type { AuditLogApiKeysTriggerEvents } from "@calcom/prisma/enums";
import type {
  AuditLogBookingTriggerEvents,
  AuditLogCredentialTriggerEvents,
  AuditLogWebhookTriggerEvents,
  AuditLogSystemTriggerEvents,
  AuditLogAppTriggerEvents,
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

export const ZAuditLogEventActor = z.object({
  id: z.number(),
  name: z.string().optional(),
  fields: z.object({}).passthrough().optional(),
});

export const ZAuditLogEventTarget = z.object({
  id: z.number(),
  name: z.string().optional(),
  type: z.string().optional(),
  fields: z.object({}).passthrough().optional(),
});

export const ZAuditLogEventGroup = z.object({
  id: z.string(),
  name: z.string(),
});

export const ZAuditLogEventBase = z.object({
  action: z.string(),
  crud: z.nativeEnum(CRUD),
  actor: ZAuditLogEventActor,
  target: ZAuditLogEventTarget,
  group: ZAuditLogEventGroup,
  description: z.string().optional(),
  is_failure: z.boolean().optional(),
  is_anonymous: z.boolean().optional(),
  fields: z.object({}).passthrough(),
  source_ip: z.string(),
});

export type AuditLogEvent = z.infer<typeof ZAuditLogEventBase>;
export type AuditLogActor = z.infer<typeof ZAuditLogEventActor>;
export type AuditLogTarget = z.infer<typeof ZAuditLogEventTarget>;
