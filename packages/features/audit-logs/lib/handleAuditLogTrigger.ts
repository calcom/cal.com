import { getAuditLogManager } from "@calcom/features/audit-logs/lib/getAuditLogManager";
import type { AuditLogEvent } from "@calcom/features/audit-logs/types";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

export async function handleAuditLogTrigger(event: AuditLogEvent) {
  try {
    const credentials = await prisma.credential.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                userId: {
                  equals: 1,
                },
              },
              {
                teamId: {
                  equals: 1,
                },
              },
            ],
            appId: {
              equals: "hey-",
            },
          },
        ],
      },
    });

    for (const credential of credentials) {
      if (
        event.target.name &&
        (credential.settings as { disabledEvents: string[] }).disabledEvents.includes(event.action)
      )
        continue;

      const auditLogManager = getAuditLogManager(credential);
      auditLogManager.reportEvent(event);
    }
  } catch (error) {
    logger.error("Error while sending audit log", error);
  }
}
