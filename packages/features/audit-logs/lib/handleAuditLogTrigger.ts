import type { AuditLogEvent } from "audit-logs/types";

import { getAuditLogManager } from "@calcom/features/audit-logs/lib/getAuditLogManager";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { AppCategories } from "@calcom/prisma/enums";

const getFirstClause = (userId: number | null | undefined, teamId: number | null | undefined) => {
  const clauses = [];
  if (userId) {
    clauses.push({
      userId: {
        equals: userId,
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

export async function handleAuditLogTrigger({
  event,
  userId,
  teamId,
}: {
  event: AuditLogEvent;
  userId?: number | null | undefined;
  teamId?: number | null | undefined;
}) {
  const firstClause = getFirstClause(userId, teamId);

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
      const settings = credential.settings as { disabledEvents: string[] | undefined };

      if (event.target.name && settings.disabledEvents && settings.disabledEvents.includes(event.action))
        continue;

      const auditLogManager = await getAuditLogManager(credential);

      if (!auditLogManager) {
        return;
      }

      auditLogManager.reportEvent(event);
    }
  } catch (error) {
    logger.error("Error while sending audit log", error);
  }
}
