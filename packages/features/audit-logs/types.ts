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
    id?: number | string;
    name?: string;
    fields?: any;
  };
  target: {
    id?: number | string;
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
  PAYMENT_INITIATED: "BOOKING_PAYMENT_INITIATED",
  BOOKING_PAID: "BOOKING_PAID",
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
}

export type DefaultAppSettingOptionEntry = {
  key: DefaultAppSettingsOptions;
  name: string;
  href: string;
  icon: IconName;
}[];

export type GenericAuditLogClient = {
  credentials: AppKeys;
  reportEvent: (event: AuditLogEvent) => void;
};
