import {
  EventTypeCreateAuditLogger,
  EventTypeUpdateAuditLogger,
  EventTypeDeleteAuditLogger,
} from "@calcom/features/audit-log/eventTypeAuditLogger";
import type { EventType } from "@calcom/prisma/client";

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
  const evenTypeDeleteAuditLogger = new EventTypeDeleteAuditLogger(
    actorUserId,
    deletedEventType as EventType
  );
  await evenTypeDeleteAuditLogger.log();
}

export async function saveEventTypeDeleteMany(actorUserId: number, deletedEventTypes: EventType[]) {
  for (let i = 0; i < deletedEventTypes.length; i++) {
    const evenTypeDeleteAuditLogger = new EventTypeDeleteAuditLogger(actorUserId, deletedEventTypes[i]);
    await evenTypeDeleteAuditLogger.log();
  }
}
