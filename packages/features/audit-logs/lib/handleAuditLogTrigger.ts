import requestIp from "request-ip";
import type { WebhookDataType } from "webhooks/lib/sendPayload";
import { z } from "zod";

import { getAuditLogManager } from "@calcom/features/audit-logs/lib/getAuditLogManager";
import { CRUD, getValues } from "@calcom/features/audit-logs/types";
import { AuditLogTriggerEvents } from "@calcom/features/audit-logs/types";
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
  let detectedIp;

  if (!req.source_ip) {
    detectedIp = requestIp.getClientIp(req);
  } else {
    detectedIp = req.source_ip;
  }

  const bookingsSchema = z.object({
    crud: z.nativeEnum(CRUD),
    action: z.enum(getValues(AuditLogTriggerEvents)),
    description: getRetracedStringParser("No description provided"),
    actor: z.object({
      id: getRetracedStringParser("-1"),
      name: getRetracedStringParser("Not provided."),
      fields: z.object({
        additionalNotes: getRetracedStringParser("Not provided."),
        email: getRetracedStringParser("Not provided"),
      }),
    }),
    target: z.object({
      id: getRetracedStringParser("Not found."),
      name: getRetracedStringParser("No host name."),
      fields: z.object({
        email: getRetracedStringParser("Not provided."),
        username: getRetracedStringParser("Not provided."),
        name: getRetracedStringParser("Not provided."),
        timezone: getRetracedStringParser("Not provided."),
      }),
      type: z.enum(getValues(AuditLogTriggerTargets)),
    }),
    fields: z.object({
      title: getRetracedStringParser("Not provided."),
      bookerUrl: getRetracedStringParser("Not provided."),
      startTime: getRetracedStringParser("Not provided."),
      endTime: getRetracedStringParser("Not provided."),
      bookingType: getRetracedStringParser("Not provided."),
      bookingTypeId: getRetracedStringParser("Not provided."),
      description: getRetracedStringParser("Not provided."),
      location: getRetracedStringParser("Not provided."),
      conferenceCredentialId: getRetracedStringParser("Not provided."),
      iCalUID: getRetracedStringParser("Not provided."),
      eventTitle: getRetracedStringParser("Not provided."),
      length: getRetracedStringParser("Not provided."),
      bookingId: getRetracedStringParser("Not provided."),
      status: getRetracedStringParser("Not provided."),
      smsReminderNumber: getRetracedStringParser("Not provided."),
      rejectionReason: getRetracedStringParser("Not provided."),
    }),
    is_anonymous: z.boolean(),
    is_failure: z.boolean(),
    group: z.object({
      id: getRetracedStringParser("Not provided."),
      name: getRetracedStringParser("Not provided."),
    }),
    created: z.date(),
    source_ip: z
      .string()
      .trim()
      .transform((value) => (value.length <= 1 ? "Not provided." : value)),
  });

  function getRetracedStringParser(message: string) {
    return z.coerce
      .string()
      .trim()
      .transform((value) => (value.length <= 1 ? message : value));
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

  const parsedSchema = bookingsSchema.parse(event);

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

      await auditLogManager.reportEvent(parsedSchema);
    }
  } catch (error) {
    logger.error("Error while sending audit log", error);
  }
}
