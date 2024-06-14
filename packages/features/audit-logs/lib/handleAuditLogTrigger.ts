import { getAuditLogManager } from "@calcom/features/audit-logs/lib/getAuditLogManager";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import {
  AppCategories,
  AuditLogTriggerTargets,
  AuditLogAppTriggerEvents,
  AuditLogSystemTriggerEvents,
} from "@calcom/prisma/enums";

import { pathToAuditLogEvent } from "../trpc/constants";
import { flattenObject } from "../utils";

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
          id: data.oldCredential.id,
          name: data.oldCredential.appId,
          type: AuditLogTriggerTargets.APPS,
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
      const innerEvent = { ...event };
      const appKey = credential.key as { disabledEvents: string[] };

      if (
        innerEvent.action === AuditLogAppTriggerEvents.APP_KEYS_UPDATED &&
        innerEvent.target.id === credential.id
      ) {
        innerEvent.action = AuditLogSystemTriggerEvents.SYSTEM_SETTINGS_UPDATED;
        innerEvent.target.type = AuditLogTriggerTargets.SYSTEM;
        if (
          innerEvent.fields["oldCredential.key.disabledEvents"].length !==
          innerEvent.fields["updatedCredential.key.disabledEvents"].length
        ) {
          if (
            innerEvent.fields["oldCredential.key.disabledEvents"].length >
            innerEvent.fields["updatedCredential.key.disabledEvents"].length
          ) {
            innerEvent.action = AuditLogSystemTriggerEvents.SYSTEM_EVENT_ON;
          } else {
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
