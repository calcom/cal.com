import type { Booking } from "@prisma/client";
import { Prisma } from "@prisma/client";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import dayjs from "@calcom/dayjs";
import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { CalendarEventClass } from "./class";

const log = logger.getSubLogger({ prefix: ["builders", "CalendarEvent", "builder"] });
const translator = short();
const userSelect = Prisma.validator<Prisma.UserArgs>()({
  select: {
    id: true,
    email: true,
    name: true,
    username: true,
    timeZone: true,
    credentials: true,
    bufferTime: true,
    destinationCalendar: true,
    locale: true,
  },
});

type User = Prisma.UserGetPayload<typeof userSelect>;
type PersonAttendeeCommonFields = Pick<User, "id" | "email" | "name" | "locale" | "timeZone" | "username">;
interface ICalendarEventBuilder {
  calendarEvent: CalendarEventClass;
  eventType: Awaited<ReturnType<CalendarEventBuilder["getEventFromEventId"]>>;
  users: Awaited<ReturnType<CalendarEventBuilder["getUserById"]>>[];
  attendeesList: PersonAttendeeCommonFields[];
  teamMembers: Awaited<ReturnType<CalendarEventBuilder["getTeamMembers"]>>;
  rescheduleLink: string;
}

export class CalendarEventBuilder implements ICalendarEventBuilder {
  calendarEvent!: CalendarEventClass;
  eventType!: ICalendarEventBuilder["eventType"];
  users!: ICalendarEventBuilder["users"];
  attendeesList: ICalendarEventBuilder["attendeesList"] = [];
  teamMembers: ICalendarEventBuilder["teamMembers"] = [];
  rescheduleLink!: string;

  constructor() {
    this.reset();
  }

  private reset() {
    this.calendarEvent = new CalendarEventClass();
  }

  public init(initProps: CalendarEventClass) {
    this.calendarEvent = new CalendarEventClass(initProps);
  }

  public setEventType(eventType: ICalendarEventBuilder["eventType"]) {
    this.eventType = eventType;
  }

  public async buildEventObjectFromInnerClass(eventId: number) {
    const resultEvent = await this.getEventFromEventId(eventId);
    if (resultEvent) {
      this.eventType = resultEvent;
    }
  }

  public async buildUsersFromInnerClass() {
    if (!this.eventType) {
      throw new Error("exec BuildEventObjectFromInnerClass before calling this function");
    }
    const users = this.eventType.users;

    /* If this event was pre-relationship migration */
    if (!users.length && this.eventType.userId) {
      const eventTypeUser = await this.getUserById(this.eventType.userId);
      if (!eventTypeUser) {
        throw new Error("buildUsersFromINnerClass.eventTypeUser.notFound");
      }
      users.push(eventTypeUser);
    }
    this.setUsers(users);
  }

  public buildAttendeesList() {
    // Language Function was set on builder init
    this.attendeesList = [
      ...(this.calendarEvent.attendees as unknown as PersonAttendeeCommonFields[]),
      ...this.teamMembers,
    ];
  }

  private async getUserById(userId: number) {
    let resultUser: User | null;
    try {
      resultUser = await prisma.user.findUniqueOrThrow({
        where: {
          id: userId,
        },
        ...userSelect,
      });
    } catch (error) {
      throw new Error("getUsersById.users.notFound");
    }
    return resultUser;
  }

  private async getEventFromEventId(eventTypeId: number) {
    let resultEventType;
    try {
      resultEventType = await prisma.eventType.findUniqueOrThrow({
        where: {
          id: eventTypeId,
        },
        select: {
          id: true,
          users: userSelect,
          team: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          description: true,
          slug: true,
          teamId: true,
          title: true,
          length: true,
          eventName: true,
          schedulingType: true,
          periodType: true,
          periodStartDate: true,
          periodEndDate: true,
          periodDays: true,
          periodCountCalendarDays: true,
          requiresConfirmation: true,
          userId: true,
          price: true,
          currency: true,
          metadata: true,
          destinationCalendar: true,
          hideCalendarNotes: true,
        },
      });
    } catch (error) {
      throw new Error("Error while getting eventType");
    }
    log.debug("getEventFromEventId.resultEventType", safeStringify(resultEventType));
    return resultEventType;
  }

  public async buildTeamMembers() {
    this.teamMembers = await this.getTeamMembers();
  }

  private async getTeamMembers() {
    // Users[0] its organizer so we are omitting with slice(1)
    const teamMemberPromises = this.users.slice(1).map(async function (user) {
      return {
        id: user.id,
        username: user.username,
        email: user.email || "", // @NOTE: Should we change this "" to teamMemberId?
        name: user.name || "",
        timeZone: user.timeZone,
        language: {
          translate: await getTranslation(user.locale ?? "en", "common"),
          locale: user.locale ?? "en",
        },
        locale: user.locale,
      } as PersonAttendeeCommonFields;
    });
    return await Promise.all(teamMemberPromises);
  }

  public buildUIDCalendarEvent() {
    if (this.users && this.users.length > 0) {
      throw new Error("call buildUsers before calling this function");
    }
    const [mainOrganizer] = this.users;
    const seed = `${mainOrganizer.username}:${dayjs(this.calendarEvent.startTime)
      .utc()
      .format()}:${new Date().getTime()}`;
    const uid = translator.fromUUID(uuidv5(seed, uuidv5.URL));
    this.calendarEvent.uid = uid;
  }

  public setLocation(location: CalendarEventClass["location"]) {
    this.calendarEvent.location = location;
  }

  public setUId(uid: CalendarEventClass["uid"]) {
    this.calendarEvent.uid = uid;
  }

  public setDestinationCalendar(destinationCalendar: CalendarEventClass["destinationCalendar"]) {
    this.calendarEvent.destinationCalendar = destinationCalendar;
  }

  public setHideCalendarNotes(hideCalendarNotes: CalendarEventClass["hideCalendarNotes"]) {
    this.calendarEvent.hideCalendarNotes = hideCalendarNotes;
  }

  public setDescription(description: CalendarEventClass["description"]) {
    this.calendarEvent.description = description;
  }

  public setNotes(notes: CalendarEvent["additionalNotes"]) {
    this.calendarEvent.additionalNotes = notes;
  }

  public setCancellationReason(cancellationReason: CalendarEventClass["cancellationReason"]) {
    this.calendarEvent.cancellationReason = cancellationReason;
  }

  public setUsers(users: User[]) {
    this.users = users;
  }

  public async setUsersFromId(userId: User["id"]) {
    let resultUser: User | null;
    try {
      resultUser = await prisma.user.findUniqueOrThrow({
        where: {
          id: userId,
        },
        ...userSelect,
      });
      this.setUsers([resultUser]);
    } catch (error) {
      throw new Error("getUsersById.users.notFound");
    }
  }

  public buildRescheduleLink(booking: Partial<Booking>, eventType?: CalendarEventBuilder["eventType"]) {
    try {
      if (!booking) {
        throw new Error("Parameter booking is required to build reschedule link");
      }
      const isTeam = !!eventType && !!eventType.teamId;
      const isDynamic = booking?.dynamicEventSlugRef && booking?.dynamicGroupSlugRef;

      let slug = "";
      if (isTeam && eventType?.team?.slug) {
        slug = `team/${eventType.team?.slug}/${eventType.slug}`;
      } else if (isDynamic) {
        const dynamicSlug = isDynamic ? `${booking.dynamicGroupSlugRef}/${booking.dynamicEventSlugRef}` : "";
        slug = dynamicSlug;
      } else if (eventType?.slug) {
        slug = `${this.users[0].username}/${eventType.slug}`;
      }

      const queryParams = new URLSearchParams();
      queryParams.set("rescheduleUid", `${booking.uid}`);
      slug = `${slug}`;

      const rescheduleLink = `${
        this.calendarEvent.bookerUrl ?? WEBAPP_URL
      }/${slug}?${queryParams.toString()}`;
      this.rescheduleLink = rescheduleLink;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`buildRescheduleLink.error: ${error.message}`);
      }
    }
  }
}
