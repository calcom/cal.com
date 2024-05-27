import type { AppKeys } from "@calcom/app-store/templates/audit-log-implementation/zod";
import type { IconName } from "@calcom/ui";

export interface AuditLogsManager {
  reportEvent(event: AuditLogEvent): Promise<void>;
}

export type AuditLogEvent = {
  action: string;
  actor: {
    id: number;
    name?: string;
  };
  target: {
    name?: string;
    type?: string;
    fields?: {
      [key: string]: string;
    };
  };
  description?: string;
  is_failure?: boolean;
  is_anonymous?: boolean;
  fields?: {
    [key: string]: string;
  };
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
