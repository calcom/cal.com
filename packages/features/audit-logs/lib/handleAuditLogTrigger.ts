import requestIp from "request-ip";
import type { WebhookDataType } from "webhooks/lib/sendPayload";

import { getAuditLogManager } from "@calcom/features/audit-logs/lib/getAuditLogManager";
import type { AuditLogTriggerEvents, CRUD } from "@calcom/features/audit-logs/types";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { AppCategories, AuditLogTriggerTargets } from "@calcom/prisma/enums";

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
  const detectedIp = requestIp.getClientIp(req);
  const event = {
    crud: crud,
    action: action,
    description: bookingData.title,
    actor: {
      id: req.userId.toString() ?? "Booker not signed in",
      name: (bookingData.responses?.name.value as string) ?? "Missing name",
      fields: {
        additionalNotes: bookingData.additionalNotes
          ? bookingData.additionalNotes.length > 1
            ? bookingData.additionalNotes
            : "No notes"
          : "No notes",
        email: bookingData.responses?.email.value ?? "No email provided",
      },
    },
    target: {
      id: bookingData.organizer.id?.toString() ?? "Organizer ID not found.",
      name: bookingData?.organizer?.username ?? "Organizer username not found.",
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
      bookingTypeId: bookingData.eventTypeId?.toString() ?? "No event type ID",
      description: bookingData.description
        ? bookingData.description.length > 1
          ? bookingData.description
          : "No description provided."
        : "No description provided.",
      location: bookingData.location ?? "No location provided.",
      conferenceCredentialId:
        bookingData.conferenceCredentialId?.toString() ?? "No conference credential ID provided.",
      iCalUID: bookingData.iCalUID,
      eventTitle: bookingData.eventTitle,
      length: bookingData.length?.toString() ?? "No length provided.",
      bookingId: bookingData.bookingId?.toString() ?? "No booking ID provided.",
      status: bookingData.status ?? "No status provided.",
      smsReminderNumber: bookingData.smsReminderNumber ?? "No SMS reminder number given.",
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

  // Next step is to create a zod pipeline that does what I'm doing above.
  // Lets start by parsing zod schemas.

  const userIds = [req.userId as number];

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

      if (event.target.name && settings.disabledEvents && settings.disabledEvents.includes(event.action))
        continue;

      const auditLogManager = await getAuditLogManager(credential);

      if (!auditLogManager) {
        return;
      }

      await auditLogManager.reportEvent(event);
    }
  } catch (error) {
    logger.error("Error while sending audit log", error);
  }
}
