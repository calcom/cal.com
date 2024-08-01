import type { EventType, Team, User } from "@calcom/prisma/client";

import { EventTypeAuditLogOption } from "./EventTypeAuditLogTypes";

export const FieldSubstituterOption = {
  EventTypeDelete: EventTypeAuditLogOption.EventTypeDelete,
  EventTypeDeleteMany: EventTypeAuditLogOption.EventTypeDeleteMany,
  UserCreate: "UserCreate",
  UserUpdate: "UserUpdate",
  UserUpdateMany: "UserUpdateMany",
  UserDelete: "UserDelete",
  UserDeleteMany: "UserDeleteMany",
  TeamDelete: "TeamDelete",
  TeamDeleteMany: "TeamDeleteMany",
} as const;

export type FieldSubstituterOption = (typeof FieldSubstituterOption)[keyof typeof FieldSubstituterOption];

type TFieldSubstituterInput =
  | {
      triggeredEvent: typeof EventTypeAuditLogOption.EventTypeDelete;
      deletedEventType: EventType;
    }
  | { triggeredEvent: typeof EventTypeAuditLogOption.EventTypeDeleteMany; deletedEventTypes: EventType[] }
  | { triggeredEvent: typeof FieldSubstituterOption.UserCreate; createdUser: User }
  | { triggeredEvent: typeof FieldSubstituterOption.UserUpdate; prevUser: User; updatedUser: User }
  | { triggeredEvent: typeof FieldSubstituterOption.UserDelete; deletedUser: User }
  | { triggeredEvent: typeof FieldSubstituterOption.UserDeleteMany; deletedUsers: User[] }
  | { triggeredEvent: typeof FieldSubstituterOption.TeamDelete; deletedTeam: Team }
  | { triggeredEvent: typeof FieldSubstituterOption.TeamDeleteMany; deletedTeams: Team[] };

export default TFieldSubstituterInput;
