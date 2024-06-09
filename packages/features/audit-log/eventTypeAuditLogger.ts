// eslint-disable-next-line no-restricted-imports
import { prisma } from "@calcom/prisma";
import type { EventType } from "@calcom/prisma/client";

import { CRUD } from "./types/CRUD";
import type {
  IEventTypeCreateLog,
  IEventTypeUpdateLog,
  IEventTypeDeleteLog,
} from "./types/EventTypeAuditLogTypes";
import { EventTypeAuditLogOption } from "./types/EventTypeAuditLogTypes";
import deepDifference from "./util/deepDifference";

export class EventTypeCreateAuditLogger {
  private readonly actionType: typeof EventTypeAuditLogOption.EventTypeCreate =
    EventTypeAuditLogOption.EventTypeCreate;
  private readonly eventTypeAuditData: IEventTypeCreateLog = {} as IEventTypeCreateLog;

  constructor(private readonly actorUserId: number, private readonly targetEventType: EventType) {
    if (!this.targetEventType.id || !this.targetEventType.teamId) return this;
    this.eventTypeAuditData = this.eventTypeCreateDataMaker(
      this.actorUserId,
      this.targetEventType.id,
      this.targetEventType.teamId
    );
  }

  private eventTypeCreateDataMaker(
    actorUserId: number,
    targetEventId: number,
    targetTeamId: number
  ): IEventTypeCreateLog {
    return {
      actionType: this.actionType,
      actorUserId,
      target: {
        targetEvent: targetEventId,
      },
      crud: CRUD.CREATE,
      targetTeamId,
    };
  }

  async log() {
    if (this.eventTypeAuditData.crud)
      await prisma.auditLog.create({
        data: this.eventTypeAuditData,
      });
  }
}

export class EventTypeUpdateAuditLogger {
  private readonly actionType: typeof EventTypeAuditLogOption.EventTypeUpdate =
    EventTypeAuditLogOption.EventTypeUpdate;
  private readonly eventTypeAuditData: IEventTypeUpdateLog = {} as IEventTypeUpdateLog;
  private readonly requiredEventTypeChanged = ["title", "length", "locations", "slug", "schedulingType"];

  constructor(
    private readonly actorUserId: number,
    private readonly prevEventType: EventType,
    private readonly targetEventType: EventType
  ) {
    if (!this.targetEventType.id || !this.targetEventType.teamId) return this;
    this.eventTypeAuditData = this.eventTypeUpdateDataMaker(
      this.actorUserId,
      this.targetEventType.id,
      this.targetEventType.teamId,
      this.prevEventType,
      this.targetEventType
    );
  }

  private eventTypeUpdateDataMaker(
    actorUserId: number,
    targetEventId: number,
    targetTeamId: number,
    prevEventType: EventType,
    targetEventType: EventType
  ): IEventTypeUpdateLog {
    const changedAttributes = deepDifference(prevEventType, targetEventType);
    const changedAttributesList = [];
    for (const key of changedAttributes) {
      if (this.requiredEventTypeChanged.includes(key) && key in targetEventType) {
        changedAttributesList.push({
          [key]: targetEventType[key],
        });
      }
    }

    const eventTypeUpdateLog: IEventTypeUpdateLog = {
      actionType: this.actionType,
      actorUserId,
      target: {
        targetEvent: targetEventId,
        changedAttributes: changedAttributesList,
      },
      crud: CRUD.UPDATE,
      targetTeamId,
    };

    return eventTypeUpdateLog;
  }

  async log() {
    if (this.eventTypeAuditData.crud)
      await prisma.auditLog.create({
        data: this.eventTypeAuditData,
      });
  }
}

export class EventTypeDeleteAuditLogger {
  private readonly actionType: typeof EventTypeAuditLogOption.EventTypeDelete =
    EventTypeAuditLogOption.EventTypeDelete;
  private readonly eventTypeAuditData: IEventTypeDeleteLog = {} as IEventTypeDeleteLog;

  constructor(private readonly actorUserId: number, private readonly targetEventType: EventType) {
    if (!this.targetEventType.id || !this.targetEventType.teamId) return this;
    this.eventTypeAuditData = this.eventTypeDeleteDataMaker(
      this.actorUserId,
      this.targetEventType,
      this.targetEventType.teamId
    );
  }

  private eventTypeDeleteDataMaker(
    actorUserId: number,
    targetEventType: EventType,
    targetTeamId: number
  ): IEventTypeDeleteLog {
    return {
      actionType: this.actionType,
      actorUserId,
      target: {
        targetEvent: targetEventType.title,
      },
      crud: CRUD.DELETE,
      targetTeamId,
    };
  }

  async log() {
    if (this.eventTypeAuditData.crud)
      await prisma.auditLog.create({
        data: this.eventTypeAuditData,
      });
  }
}
