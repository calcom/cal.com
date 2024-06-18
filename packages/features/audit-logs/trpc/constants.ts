import { CRUD } from "@calcom/features/audit-logs/types";
import type { AuditLogTriggerEvents } from "@calcom/features/audit-logs/types";
import {
  AuditLogTriggerTargets,
  AuditLogSystemTriggerEvents,
  AuditLogAppTriggerEvents,
  AuditLogCredentialTriggerEvents,
  AuditLogApiKeysTriggerEvents,
  AuditLogBookingTriggerEvents,
  AuditLogWebhookTriggerEvents,
} from "@calcom/prisma/enums";

type AuditLogTriggerMetadata = {
  action: AuditLogTriggerEvents;
  description: string;
  crud: CRUD;
  target: AuditLogTriggerTargets;
};

export const triggerToMetadata: Partial<Record<AuditLogTriggerEvents, AuditLogTriggerMetadata>> = {
  [AuditLogWebhookTriggerEvents.WEBHOOK_TESTED]: {
    action: AuditLogWebhookTriggerEvents.WEBHOOK_TESTED,
    description: "Webhook was tested.",
    crud: CRUD.READ,
    target: AuditLogTriggerTargets.WEBHOOKS,
  },
  [AuditLogWebhookTriggerEvents.WEBHOOK_UPDATED]: {
    action: AuditLogWebhookTriggerEvents.WEBHOOK_UPDATED,
    description: "Webhook was updated.",
    crud: CRUD.UPDATE,
    target: AuditLogTriggerTargets.WEBHOOKS,
  },
  [AuditLogWebhookTriggerEvents.WEBHOOK_DELETED]: {
    action: AuditLogWebhookTriggerEvents.WEBHOOK_DELETED,
    description: "Webhook was deleted.",
    crud: CRUD.DELETE,
    target: AuditLogTriggerTargets.WEBHOOKS,
  },
  [AuditLogWebhookTriggerEvents.WEBHOOK_SCHEDULED]: {
    action: AuditLogWebhookTriggerEvents.WEBHOOK_SCHEDULED,
    description: "Webhook was scheduled.",
    crud: CRUD.UPDATE,
    target: AuditLogTriggerTargets.WEBHOOKS,
  },
  [AuditLogWebhookTriggerEvents.WEBHOOK_CREATED]: {
    action: AuditLogWebhookTriggerEvents.WEBHOOK_CREATED,
    description: "Webhook was created.",
    crud: CRUD.CREATE,
    target: AuditLogTriggerTargets.WEBHOOKS,
  },
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
  [AuditLogApiKeysTriggerEvents.API_KEY_USED]: {
    action: AuditLogApiKeysTriggerEvents.API_KEY_USED,
    description: "An apiKey was used.",
    crud: CRUD.READ,
    target: AuditLogTriggerTargets.API_KEYS,
  },
  [AuditLogApiKeysTriggerEvents.API_KEY_LIST_ALL_KEYS]: {
    action: AuditLogApiKeysTriggerEvents.API_KEY_LIST_ALL_KEYS,
    description: "Api keys have been listed.",
    crud: CRUD.READ,
    target: AuditLogTriggerTargets.API_KEYS,
  },
  [AuditLogApiKeysTriggerEvents.API_KEY_FIND_KEY]: {
    action: AuditLogApiKeysTriggerEvents.API_KEY_FIND_KEY,
    description: "Api key find key.",
    crud: CRUD.READ,
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
  [AuditLogAppTriggerEvents.APP_CREATED]: {
    action: AuditLogAppTriggerEvents.APP_CREATED,
    description: "An app has been created.",
    crud: CRUD.UPDATE,
    target: AuditLogTriggerTargets.APPS,
  },
  [AuditLogCredentialTriggerEvents.CREDENTIAL_KEYS_UPDATED]: {
    action: AuditLogCredentialTriggerEvents.CREDENTIAL_KEYS_UPDATED,
    description: "App keys have been updated",
    crud: CRUD.UPDATE,
    target: AuditLogTriggerTargets.CREDENTIAL,
  },
  [AuditLogCredentialTriggerEvents.CREDENTIAL_CREATED]: {
    action: AuditLogCredentialTriggerEvents.CREDENTIAL_CREATED,
    description: "A credential was created.",
    crud: CRUD.UPDATE,
    target: AuditLogTriggerTargets.CREDENTIAL,
  },
  [AuditLogCredentialTriggerEvents.CREDENTIAL_DELETED]: {
    action: AuditLogCredentialTriggerEvents.CREDENTIAL_DELETED,
    description: "A credential was deleted.",
    crud: CRUD.DELETE,
    target: AuditLogTriggerTargets.CREDENTIAL,
  },
  [AuditLogSystemTriggerEvents.SYSTEM_MISC]: {
    action: AuditLogSystemTriggerEvents.SYSTEM_MISC,
    description: "AuditLog implementation specific action was performed.",
    crud: CRUD.UPDATE,
    target: AuditLogTriggerTargets.SYSTEM,
  },
};
