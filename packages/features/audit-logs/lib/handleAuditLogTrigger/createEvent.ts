import { flattenObject } from "@calcom/features/audit-logs/utils";
import { safeStringify } from "@calcom/lib/safeStringify";
import { AuditLogSystemTriggerEvents, AuditLogTriggerTargets } from "@calcom/prisma/enums";

import { log } from ".";
import type { AuditLogTriggerMetadata } from "../../trpc/constants";
import { triggerToMetadata } from "../../trpc/constants";
import type { AuditLogTarget } from "../../types";
import { CRUD, type AuditLogEvent, type AuditLogTriggerEvents } from "../../types";

export function createEvent(
  trigger: AuditLogTriggerEvents,
  user: { name: string; id: number },
  data: any,
  source_ip: string
): AuditLogEvent {
  const triggerMeta = triggerToMetadata[trigger];
  let dynamicSection: Omit<AuditLogTriggerMetadata, "target"> & { target: AuditLogTarget };
  log.silly("Event trigger metadata is ", safeStringify({ trigger, triggerMeta, data }));
  switch (triggerMeta?.target) {
    case AuditLogTriggerTargets.BOOKING:
      dynamicSection = {
        ...triggerMeta,
        target: {
          id: data.organizer.id,
          name: data?.organizer?.username,
          type: AuditLogTriggerTargets.BOOKING,
        },
      };
      break;
    case AuditLogTriggerTargets.APPS:
      dynamicSection = {
        ...triggerMeta,
        target: {
          id: data.app.slug,
          name: data.app.slug,
          type: AuditLogTriggerTargets.APPS,
        },
      };
      break;
    case AuditLogTriggerTargets.CREDENTIAL:
      dynamicSection = {
        ...triggerMeta,
        target: {
          id: data.oldCredential.id,
          name: data.oldCredential.appId,
          type: AuditLogTriggerTargets.CREDENTIAL,
        },
      };
      break;
    case AuditLogTriggerTargets.API_KEYS:
      dynamicSection = {
        ...triggerMeta,
        target: {
          id: data.apiKey.id,
          name: data.apiKey.note,
          type: AuditLogTriggerTargets.API_KEYS,
        },
      };
      break;
    case AuditLogTriggerTargets.WEBHOOKS:
      dynamicSection = {
        ...triggerMeta,
        target: {
          id: data.webhook.id,
          name: data.webhook.id,
          type: AuditLogTriggerTargets.WEBHOOKS,
        },
      };
      break;
    default:
      dynamicSection = {
        action: AuditLogSystemTriggerEvents.SYSTEM_MISC,
        description: "Unrecognized trigger.",
        crud: CRUD.DELETE,
        target: {
          id: data.id,
          name: data.appId,
          type: AuditLogTriggerTargets.SYSTEM,
        },
      };
      break;
  }

  return {
    actor: {
      id: user.id,
      name: user.name,
    },
    ...dynamicSection,
    is_anonymous: user.id === -1 ? true : false,
    is_failure: false,
    group: {
      id: "default",
      name: "default",
    },
    fields: flattenObject(data),
    source_ip,
  };
}
