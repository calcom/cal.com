import { getAuditLogManager } from "@calcom/features/audit-logs/lib/getAuditLogManager";
import logger from "@calcom/lib/logger";
import { getPiiFreeCredential } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import {
  AppCategories,
  AuditLogTriggerTargets,
  AuditLogAppTriggerEvents,
  AuditLogSystemTriggerEvents,
  AuditLogCredentialTriggerEvents,
} from "@calcom/prisma/enums";

import { pathToAuditLogEvent } from "../trpc/constants";
import { flattenObject } from "../utils";

const log = logger.getSubLogger({ prefix: ["handleAuditLogTrigger"] });

const getFirstClause = (userId: number[] | null | undefined, teamId: number | null | undefined) => {
  const clauses = [];
  if (userId) {
    clauses.push({
      userId: {
        in: userId,
      },
    });
  }

  if (teamId) {
    clauses.push({
      teamId: {
        equals: teamId,
      },
    });
  }

  if (clauses.length > 1) {
    return { OR: [...clauses] };
  } else return clauses[0];
};

export function createEvent(path: string, user: any, data: any) {
  const triggerMeta = pathToAuditLogEvent[path];
  log.silly("Event trigger metadata is ", safeStringify({ path, triggerMeta, data }));
  switch (triggerMeta.target) {
    case AuditLogTriggerTargets.BOOKING:
      return {
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
    case AuditLogTriggerTargets.APPS:
      return {
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
    case AuditLogTriggerTargets.CREDENTIAL:
      return {
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
    default:
      return {
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
  }
}

export async function handleAuditLogTrigger({
  action,
  user,
  source_ip,
  data,
}: {
  action: string;
  user: { name: string; id: number };
  source_ip?: string | undefined;
  data: any;
}) {
  log.silly("Creating event.", safeStringify({ action, user, source_ip, data }));
  const event = {
    ...createEvent(action, user, data),
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
  log.silly("Event created", safeStringify(event));
  // const parsedEvent = ZAuditLogEventBase.parse(event);

  const userIds = [user.id as number];

  const firstClause = getFirstClause(userIds, null);
  try {
    const credentials = await prisma.credential.findMany({
      where: {
        AND: [
          firstClause,
          {
            type: {
              contains: AppCategories.auditLogs,
            },
          },
        ],
      },
    });

    for (const credential of credentials) {
      log.silly(
        "Reporting procedure started for credential: ",
        safeStringify(getPiiFreeCredential(credential))
      );
      const innerEvent = { ...event };
      const appKey = credential.key as { disabledEvents: string[] };

      if (
        (innerEvent.action === AuditLogAppTriggerEvents.APP_KEYS_UPDATED ||
          innerEvent.action === AuditLogCredentialTriggerEvents.CREDENTIAL_KEYS_UPDATED) &&
        innerEvent.target.id === credential.id
      ) {
        log.silly("Action intercepted by system interceptor. SYSTEM_SETTINGS_UPDATED");
        innerEvent.action = AuditLogSystemTriggerEvents.SYSTEM_SETTINGS_UPDATED;
        innerEvent.target.type = AuditLogTriggerTargets.SYSTEM;
        if (
          innerEvent.fields["oldCredential.key.disabledEvents"].length !==
          innerEvent.fields["updatedCredential.key.disabledEvents"].length
        ) {
          log.silly("Disabled events updated.");
          if (
            innerEvent.fields["oldCredential.key.disabledEvents"].length >
            innerEvent.fields["updatedCredential.key.disabledEvents"].length
          ) {
            log.silly("SYSTEM_EVENT_ON");
            innerEvent.action = AuditLogSystemTriggerEvents.SYSTEM_EVENT_ON;
          } else {
            log.silly("SYSTEM_EVENT_OFF");
            innerEvent.action = AuditLogSystemTriggerEvents.SYSTEM_EVENT_OFF;
          }
        }
      }

      if (
        appKey.disabledEvents &&
        appKey.disabledEvents.includes(event.action) &&
        event.target.type !== AuditLogTriggerTargets.SYSTEM
      )
        continue;

      const auditLogManager = await getAuditLogManager({ credential });
      if (!auditLogManager) {
        return;
      }

      await auditLogManager.reportEvent(innerEvent);
    }
  } catch (error) {
    logger.error("Error while sending audit log", error);
  }
}
