import type { AppKeys } from "@calcom/app-store/templates/audit-log-implementation/zod";
import type { IconName } from "@calcom/ui";

export interface AuditLogsManager {
  reportEvent(event: AuditLogEvent): void;
}

export type AuditLogEvent = {
  action: string;
  actor: {
    id: string;
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

export const AuditLogTriggerEvents = {
  BOOKING_CREATED: "BOOKING_CREATED",
  BOOKING_MODIFIED: "BOOKING_MODIFIED",
  BOOKING_RESCHEDULED: "BOOKING_RESCHEDULED",
  BOOKING_REQUESTED: "BOOKING_REQUESTED",
  BOOKING_CANCELLED: "BOOKING_CANCELLED",
  BOOKING_REJECTED: "BOOKING_REJECTED",
  PAYMENT_INITIATED: "BOOKING_PAYMENT_INITIATED",
  BOOKING_PAID: "BOOKING_PAID",
} as const;

export type AppSettingOptionEntry = {
  name: string;
  href: string;
  icon: IconName;
}[];

export type GenericAuditLogClient = {
  credentials: AppKeys;
  reportEvent: (event: AuditLogEvent) => void;
};
