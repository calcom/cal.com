import type { AppKeys } from "@calcom/app-store/templates/audit-log-implementation/zod";
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

export type AuditLogEvent = {
  action: string;
  crud?: CRUD;
  actor: {
    id: string;
    name?: string;
    fields?: any;
  };
  target: {
    id: string;
    name?: string;
    type?: string;
    fields?: any;
  };
  description?: string;
  is_failure?: boolean;
  is_anonymous?: boolean;
  fields?: any;
};

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

export type GeneralSettingsOption = {
  name: string;
  description: string;
  button: string;
  component?: React.ReactNode;
};

export type GenericAuditLogClient = {
  credentials: AppKeys;
  reportEvent: (event: AuditLogEvent) => void;
};
