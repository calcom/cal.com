import requestIp from "request-ip";
import type { WebhookDataType } from "webhooks/lib/sendPayload";

import { getAuditLogManager } from "@calcom/features/audit-logs/lib/getAuditLogManager";
import { bookingSchemaGenerated, CRUD, ZAuditLogEventBase } from "@calcom/features/audit-logs/types";
import type { AuditLogTriggerEvents } from "@calcom/features/audit-logs/types";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { AppCategories, AuditLogTriggerTargets } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

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

export async function handleAuditLogTrigger({
  req,
  bookingData,
  action,
  crud,
}: {
  req: any;
  bookingData: Omit<WebhookDataType, "createdAt" | "triggerEvent">;
  action: keyof typeof AuditLogTriggerEvents;
  crud: CRUD;
}) {
  // 1. Get IP
  // 2. Parse Event
  // 3. Get relevant user and team ids.
  // 4. Get credentials for all relevant ids.
  // 5. Loop through credentials and report respectively.
  let detectedIp;

  if (!req.source_ip) {
    detectedIp = requestIp.getClientIp(req);
  } else {
    detectedIp = req.source_ip;
  }

  const event = {
    crud: crud,
    action: action,
    description: bookingData.title,
    actor: {
      id: req.userId,
      name: bookingData.responses?.name.value,
      fields: {
        additionalNotes: bookingData.additionalNotes,
        email: bookingData.responses?.email.value,
      },
    },
    target: {
      id: bookingData.organizer.id,
      name: bookingData?.organizer?.username,
      fields: {
        email: bookingData.organizer.email,
        username: bookingData.organizer.username,
        name: bookingData.organizer.name,
        timezone: bookingData.organizer.timeZone,
      },
      type: AuditLogTriggerTargets.BOOKING,
    },
    fields: {
      title: bookingData.title,
      bookerUrl: bookingData.bookerUrl,
      startTime: bookingData.startTime,
      endTime: bookingData.endTime,
      bookingType: bookingData.type,
      bookingTypeId: bookingData.eventTypeId,
      description: bookingData.description,
      location: bookingData.location,
      conferenceCredentialId: bookingData.conferenceCredentialId,
      iCalUID: bookingData.iCalUID,
      eventTitle: bookingData.eventTitle,
      length: bookingData.length,
      bookingId: bookingData.bookingId,
      status: bookingData.status,
      smsReminderNumber: bookingData.smsReminderNumber,
      rejectionReason: bookingData.rejectionReason,
    },
    is_anonymous: req.userId === -1 ? true : false,
    is_failure: false,
    group: {
      id: "default",
      name: "default",
    },
    created: new Date(),
    source_ip: detectedIp === "::1" ? "127.0.0.1" : detectedIp,
  };

  const parsedSchema = bookingSchemaGenerated.parse(event);

  // Next step is to create a zod pipeline that does what I'm doing above.
  // Lets start by parsing zod schemas.
  const userIds = [req.userId as number, bookingData.organizer.id as number];

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
      const settings = credential.settings as { disabledEvents: string[] | undefined };

      if (settings.disabledEvents && settings.disabledEvents.includes(event.action)) continue;

      const auditLogManager = await getAuditLogManager(credential);

      if (!auditLogManager) {
        return;
      }

      await auditLogManager.reportEvent(parsedSchema);
    }
  } catch (error) {
    logger.error("Error while sending audit log", error);
  }
}

export async function handleAuditLogTriggerTemp({
  path,
  user,
  sourceIp,
  credential,
}: {
  path?: any;
  user: NonNullable<TrpcSessionUser>;
  sourceIp?: string | undefined;
  credential?: Credential;
}) {
  // 2. Parse Event
  // 3. Get relevant user and team ids.
  // 4. Get credentials for all relevant ids.
  // 5. Loop through credentials and report respectively.
  const event = {
    crud: CRUD.UPDATE,
    action: "SYSTEM_CREDENTIALS_UPDATED",
    description: "App keys have been updated",
    actor: {
      id: user.id.toString(),
      name: user.name,
    },
    target: {
      id: credential?.id.toString() ?? "-1",
      name: "BoxyHQ Retraced",
      type: AuditLogTriggerTargets.APPS,
    },
    fields: {
      oldCredential: "this is a test",
      newCredential: "this is a test",
    },
    group: {
      id: "default",
      name: "default",
    },
    created: new Date(),
    source_ip: sourceIp,
  };

  const parsedEvent = ZAuditLogEventBase.parse(event);

  // TODO: in case of update app credentials notify user audit log app, and credential.
  // So if credential has a team ID notify the audit log app of the team.
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
      const settings = credential.settings as { disabledEvents: string[] | undefined };

      if (settings.disabledEvents && settings.disabledEvents.includes(event.action)) continue;

      const auditLogManager = await getAuditLogManager(credential);

      if (!auditLogManager) {
        return;
      }

      await auditLogManager.reportEvent(parsedEvent);
    }
  } catch (error) {
    logger.error("Error while sending audit log", error);
  }
}
