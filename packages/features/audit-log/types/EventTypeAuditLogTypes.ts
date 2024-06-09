import type { CRUD } from "./CRUD";

export const EventTypeAuditLogOption = {
  EventTypeCreate: "EventTypeCreate",
  EventTypeUpdate: "EventTypeUpdate",
  EventTypeUpdateMany: "EventTypeUpdateMany",
  EventTypeDelete: "EventTypeDelete",
  EventTypeDeleteMany: "EventTypeDeleteMany",
} as const;

export type EventTypeAuditLogOption = (typeof EventTypeAuditLogOption)[keyof typeof EventTypeAuditLogOption];

export interface IEventTypeCreateLog {
  actionType: typeof EventTypeAuditLogOption.EventTypeCreate;
  actorUser: { id: number };
  target: {
    targetEvent: number | string;
  };
  crud: typeof CRUD.CREATE;
  targetTeam: { id: number };
}

export interface IEventTypeUpdateLog {
  actionType: typeof EventTypeAuditLogOption.EventTypeUpdate;
  actorUser: { id: number };
  target: {
    targetEvent: number | string;
    changedAttributes: {
      [propName: string]: unknown;
    }[];
  };
  crud: typeof CRUD.UPDATE;
  targetTeam: { id: number };
}

export interface IEventTypeDeleteLog {
  actionType: typeof EventTypeAuditLogOption.EventTypeDelete;
  actorUser: { id: number };
  target: {
    targetEvent: string;
  };
  crud: typeof CRUD.DELETE;
  targetTeam: { id: number };
}

export type IEventTypeLog = IEventTypeCreateLog | IEventTypeUpdateLog | IEventTypeDeleteLog;
