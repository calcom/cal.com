import {
  EventTypeCreateAuditLogger,
  EventTypeUpdateAuditLogger,
  EventTypeDeleteAuditLogger,
} from "@calcom/features/audit-log/eventTypeAuditLogger";
import { prisma } from "@calcom/prisma";
import type { EventType, Prisma } from "@calcom/prisma/client";

export async function saveEventTypeCreate(actorUserId: number, createdEventType: EventType) {
  const evenTypeCreateAuditLogger = new EventTypeCreateAuditLogger(actorUserId, createdEventType);
  await evenTypeCreateAuditLogger.log();
}

export async function saveEventTypeUpdate(
  actorUserId: number,
  prevEventType: EventType,
  updatedEventType: EventType
) {
  const evenTypeUpdateAuditLogger = new EventTypeUpdateAuditLogger(
    actorUserId,
    prevEventType,
    updatedEventType
  );
  await evenTypeUpdateAuditLogger.log();
}

export async function saveEventTypeUpdateMany(
  actorUserId: number,
  prevEventTypes: EventType[],
  listOfUpdatedEventTypes: EventType[]
) {
  for (let i = 0; i < prevEventTypes.length; i++) {
    const evenTypeUpdateAuditLogger = new EventTypeUpdateAuditLogger(
      actorUserId,
      prevEventTypes[i],
      listOfUpdatedEventTypes[i]
    );
    await evenTypeUpdateAuditLogger.log();
  }
}

export async function saveEventTypeDelete(actorUserId: number, deletedEventType: EventType) {
  const toBeUpdatedAuditLogs = await prisma.auditLog.findMany({
    where: { target: { path: ["targetEvent"], equals: deletedEventType.id } },
  });
  toBeUpdatedAuditLogs.forEach(async (toBeUpdatedAuditLog) => {
    const updatedTarget = toBeUpdatedAuditLog.target as Prisma.JsonObject;
    if ("targetEvent" in updatedTarget) {
      updatedTarget.targetEvent = deletedEventType.title;
      await prisma.auditLog.update({
        where: { id: toBeUpdatedAuditLog.id },
        data: { target: updatedTarget },
      });
    }
  });
  const evenTypeDeleteAuditLogger = new EventTypeDeleteAuditLogger(
    actorUserId,
    deletedEventType as EventType
  );
  await evenTypeDeleteAuditLogger.log();
}

export async function saveEventTypeDeleteMany(actorUserId: number, deletedEventTypes: EventType[]) {
  const toBeUpdatedAuditLogs = await prisma.auditLog.findMany({
    where: {
      target: {
        path: ["targetEvent"],
        equals: { in: deletedEventTypes.map((e: EventType) => e.id) },
      },
    },
  });
  toBeUpdatedAuditLogs.forEach(async (toBeUpdatedAuditLog) => {
    const updatedTarget = toBeUpdatedAuditLog.target as Prisma.JsonObject;
    if ("targetEvent" in updatedTarget) {
      updatedTarget.targetEvent = deletedEventTypes.find(
        (e: EventType) => e.id === updatedTarget.targetEvent
      )?.title;
      await prisma.auditLog.update({
        where: { id: toBeUpdatedAuditLog.id },
        data: { target: updatedTarget },
      });
    }
  });
  for (let i = 0; i < deletedEventTypes.length; i++) {
    const evenTypeDeleteAuditLogger = new EventTypeDeleteAuditLogger(actorUserId, deletedEventTypes[i]);
    await evenTypeDeleteAuditLogger.log();
  }
}
