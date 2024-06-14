import { flattenObject } from "@calcom/features/audit-logs/utils";
import { safeStringify } from "@calcom/lib/safeStringify";
import { AuditLogTriggerTargets } from "@calcom/prisma/enums";

import { log } from ".";
import { triggerToMetadata } from "../../trpc/constants";

export function createEvent(trigger: string, user: any, data: any, source_ip: string | undefined) {
  const triggerMeta = triggerToMetadata[trigger];
  let dynamicSection: any;
  log.silly("Event trigger metadata is ", safeStringify({ trigger, triggerMeta, data }));
  switch (triggerMeta.target) {
    case AuditLogTriggerTargets.BOOKING:
      dynamicSection = {
        ...triggerMeta,
        actor: {
          id: user.id,
          name: data.responses?.name.value,
        },
        target: {
          id: data.organizer.id,
          name: data?.organizer?.username,
          type: AuditLogTriggerTargets.BOOKING,
        },
      };
      break;
    case AuditLogTriggerTargets.APPS:
      // if data.updatedAt == null then action: APPS.APP_CREATED
      dynamicSection = {
        ...triggerMeta,
        actor: {
          id: user.id.toString(),
          name: user.name,
        },
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
        actor: {
          id: user.id.toString(),
          name: user.name,
        },
        target: {
          id: data.oldCredential.id,
          name: data.oldCredential.appId,
          type: AuditLogTriggerTargets.CREDENTIAL,
        },
      };
      break;
    default:
      dynamicSection = {
        ...triggerMeta,
        actor: {
          id: user.id.toString(),
          name: user.name,
        },
        target: {
          id: data.id,
          name: data.appId,
          type: AuditLogTriggerTargets.APPS,
        },
      };
      return;
  }

  return {
    ...dynamicSection,
    is_anonymous: user.id === -1 ? true : false,
    is_failure: false,
    group: {
      id: "default",
      name: "default",
    },
    fields: flattenObject(data),
    created: new Date(),
    source_ip,
  };
}
