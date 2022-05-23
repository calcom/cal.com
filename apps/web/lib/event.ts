import { EventType, Membership, MembershipRole, User } from "@prisma/client";
import { TFunction } from "next-i18next";

type EventNameObjectType = {
  attendeeName: string;
  eventType: string;
  eventName?: string | null;
  host: string;
  t: TFunction;
};

export function getEventName(eventNameObj: EventNameObjectType) {
  return eventNameObj.eventName
    ? eventNameObj.eventName.replace("{USER}", eventNameObj.attendeeName)
    : eventNameObj.t("event_between_users", {
        eventName: eventNameObj.eventType,
        host: eventNameObj.host,
        attendeeName: eventNameObj.attendeeName,
      });
}

export function canEventBeEdited({
  user,
  eventType,
}: {
  user: {
    id: User["id"];
  };
  eventType: {
    users: {
      id: User["id"];
    }[];
    userId: User["id"] | null;
    team: {
      members: {
        userId: Membership["userId"];
        role: MembershipRole;
      }[];
    } | null;
  };
}) {
  // I am the creator of the event.
  if (eventType.userId === user.id) {
    return true;
  }

  // Check if he is the owner of the team to which event belongs
  if (eventType.team) {
    return eventType.team.members
      .filter((member) => {
        return member.role === MembershipRole.OWNER || member.role === MembershipRole.ADMIN;
      })
      .map((member) => member.userId)
      .includes(user.id);
  }
  return eventType.users.find((user) => user.id === user.id);
}
