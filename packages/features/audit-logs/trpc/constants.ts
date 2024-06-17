import { CRUD } from "@calcom/features/audit-logs/types";
import {
  AuditLogTriggerTargets,
  AuditLogSystemTriggerEvents,
  AuditLogAppTriggerEvents,
  AuditLogCredentialTriggerEvents,
  AuditLogApiKeysTriggerEvents,
  AuditLogBookingTriggerEvents,
} from "@calcom/prisma/enums";

export const triggerToMetadata: Record<string, any> = {
  // updateAppCredentials: {
  //   action: AuditLogSystemTriggerEvents.SYSTEM_SETTINGS_UPDATED,
  //   description: "App keys have been updated",
  //   crud: CRUD.UPDATE,
  //   target: AuditLogTriggerTargets.SYSTEM,
  // },
  [AuditLogBookingTriggerEvents.BOOKING_CREATED]: {
    action: AuditLogBookingTriggerEvents.BOOKING_CREATED,
    description: "An apiKey was created.",
    crud: CRUD.CREATE,
    target: AuditLogTriggerTargets.BOOKING,
  },
  [AuditLogBookingTriggerEvents.BOOKING_RESCHEDULED]: {
    action: AuditLogBookingTriggerEvents.BOOKING_RESCHEDULED,
    description: "An apiKey was created.",
    crud: CRUD.CREATE,
    target: AuditLogTriggerTargets.BOOKING,
  },
  [AuditLogBookingTriggerEvents.BOOKING_PAID]: {
    action: AuditLogBookingTriggerEvents.BOOKING_PAID,
    description: "An apiKey was created.",
    crud: CRUD.CREATE,
    target: AuditLogTriggerTargets.BOOKING,
  },

  [AuditLogBookingTriggerEvents.BOOKING_PAYMENT_INITIATED]: {
    action: AuditLogBookingTriggerEvents.BOOKING_PAYMENT_INITIATED,
    description: "An apiKey was created.",
    crud: CRUD.CREATE,
    target: AuditLogTriggerTargets.BOOKING,
  },
  [AuditLogBookingTriggerEvents.BOOKING_CONFIRMED]: {
    action: AuditLogBookingTriggerEvents.BOOKING_CONFIRMED,
    description: "An apiKey was created.",
    crud: CRUD.CREATE,
    target: AuditLogTriggerTargets.BOOKING,
  },
  [AuditLogBookingTriggerEvents.BOOKING_REJECTED]: {
    action: AuditLogBookingTriggerEvents.BOOKING_REJECTED,
    description: "An apiKey was created.",
    crud: CRUD.CREATE,
    target: AuditLogTriggerTargets.BOOKING,
  },
  [AuditLogBookingTriggerEvents.BOOKING_REQUESTED]: {
    action: AuditLogBookingTriggerEvents.BOOKING_REQUESTED,
    description: "An apiKey was created.",
    crud: CRUD.CREATE,
    target: AuditLogTriggerTargets.BOOKING,
  },
  [AuditLogBookingTriggerEvents.BOOKING_CANCELLED]: {
    action: AuditLogBookingTriggerEvents.BOOKING_CANCELLED,
    description: "An apiKey was created.",
    crud: CRUD.CREATE,
    target: AuditLogTriggerTargets.BOOKING,
  },
  [AuditLogApiKeysTriggerEvents.API_KEY_CREATED]: {
    action: AuditLogApiKeysTriggerEvents.API_KEY_CREATED,
    description: "An apiKey was created.",
    crud: CRUD.CREATE,
    target: AuditLogTriggerTargets.API_KEYS,
  },
  [AuditLogApiKeysTriggerEvents.API_KEY_DELETED]: {
    action: AuditLogApiKeysTriggerEvents.API_KEY_DELETED,
    description: "An apiKey was deleted.",
    crud: CRUD.DELETE,
    target: AuditLogTriggerTargets.API_KEYS,
  },
  [AuditLogApiKeysTriggerEvents.API_KEY_UPDATED]: {
    action: AuditLogApiKeysTriggerEvents.API_KEY_UPDATED,
    description: "An apiKey was updated.",
    crud: CRUD.UPDATE,
    target: AuditLogTriggerTargets.API_KEYS,
  },
  [AuditLogAppTriggerEvents.APP_TOGGLE]: {
    action: AuditLogAppTriggerEvents.APP_TOGGLE,
    description: "App has been enabled/disabled by admin.",
    crud: CRUD.UPDATE,
    target: AuditLogTriggerTargets.APPS,
  },
  [AuditLogAppTriggerEvents.APP_KEYS_UPDATED]: {
    action: AuditLogAppTriggerEvents.APP_KEYS_UPDATED,
    description: "App keys have been updated by admin.",
    crud: CRUD.UPDATE,
    target: AuditLogTriggerTargets.APPS,
  },
  [AuditLogCredentialTriggerEvents.CREDENTIAL_KEYS_UPDATED]: {
    action: AuditLogCredentialTriggerEvents.CREDENTIAL_KEYS_UPDATED,
    description: "App keys have been updated",
    crud: CRUD.UPDATE,
    target: AuditLogTriggerTargets.CREDENTIAL,
  },
  systemMisc: {
    action: AuditLogSystemTriggerEvents.SYSTEM_MISC,
    description: "AuditLog implementation specific action was performed.",
    crud: CRUD.UPDATE,
    target: AuditLogTriggerTargets.SYSTEM,
  },
};
