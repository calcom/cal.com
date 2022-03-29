import { Booking, Prisma, SchedulingType } from "@prisma/client";
import dayjs from "dayjs";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import prisma from "@calcom/prisma";
import { Person } from "@calcom/types/Calendar";

import { CalendarEventBuilder } from ".";
import { ensureArray } from "../../../../apps/web/lib/ensureArray";
import { getEventName } from "../../../../apps/web/lib/event";
import { getTranslation } from "../../../../apps/web/server/lib/i18n";

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

interface ICalendarEventDirector extends Booking {
  timeZone: any;
  start: any;
  end: any;
  eventTypeId: any;
  translationAttendees: string;
  translationOwner: string;
  attendee: any;
  guestAttendees: any;
  location: any;
  eventName: any;
  notes: any;
  customInputs: any;
}

export class CalendarEventDirector {
  // Required props
  private booking: Booking;
  private attendee: any;
  private guestsAttendees: any;
  private start: any;
  private end: any;
  private eventName: any;
  private translationAttendees: string;
  private translationGuests: string;
  private translationOwner: any;
  private eventTypeId: any;
  private timeZone: any;
  private location: any;
  private notes: string;
  private customInputs: any;

  // Internal control
  private builder: CalendarEventBuilder;
  private eventType: any;
  private users: any;
  private organizer: any;
  private invitee?: Person;
  private guests?: Person[];
  private teamMembers?: Person[];
  private attendeesList?: Person[];
  private eventNameObject?: {
    attendeeName: string;
    eventType: string;
    eventName: string;
    host: string;
    // @TODO: TFunction;
    t: any;
  };
  private description?: string;

  constructor(props: ICalendarEventDirector) {
    this.booking = props;
    this.attendee = props.attendee;
    this.guestsAttendees = props.guestAttendees;
    this.start = props.start;
    this.end = props.end;
    this.timeZone = props.timeZone;
    this.attendee = props.attendee;
    this.eventTypeId = props.eventTypeId;
    this.translationAttendees = props.translationAttendees;
    this.translationGuests = props.translationAttendees;
    this.location = props.location;
    this.eventName = props.eventName;
    this.notes = props.notes;
    this.customInputs = props.customInputs;
  }

  public async buildRequiredParams() {
    if (this.isTimeInPast(this.start)) {
      throw new Error(`Booking ${this.eventTypeId} failed`);
    }
    const eventTypeId = this.booking.eventTypeId;
    await this.buildEventType(eventTypeId);
    this.buildUsers(this.eventType.users);
    this.buildOrganizerFromUserId(this.users[0]);
    this.setOrganizerLanguage(this.organizer.language);
    this.buildInvitee();
    this.buildGuest();
    this.buildUID();
    this.buildDescription();
    this.buildEventNameObject();
    this.builder = new CalendarEventBuilder({
      type: this.eventType.title,
      title: getEventName(this.eventNameObject), //this needs to be either forced in english, or fetched for each attendee and organizer separately
      startTime: this.start,
      endTime: this.end,
      organizer: {
        name: this.users[0].name || "Nameless",
        email: this.users[0].email || "Email-less",
        timeZone: this.users[0].timeZone,
        language: { translate: this.translationOwner, locale: this.organizer?.locale ?? "en" },
      },
      attendees: this.attendeesList,
    });
    return this.builder;
  }

  private async buildEventType(eventTypeId: number | null) {
    if (eventTypeId === null) {
      throw new Error("Event Type Id not received");
    }
    const eventType = await prisma.eventType.findUnique({
      rejectOnNotFound: true,
      where: {
        id: eventTypeId,
      },
      select: {
        users: userSelect,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
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
      },
    });

    this.eventType = eventType;
  }

  private async buildUsers(_users: User[]) {
    let users = _users;
    if (!users.length && this.eventType.userId) {
      const eventTypeUser = await prisma.user.findUnique({
        where: {
          id: this.eventType.userId,
        },
        ...userSelect,
      });
      if (!eventTypeUser) {
        throw new Error("eventTypeUser.notFound");
      }
      users.push(eventTypeUser);
    }

    if (this.eventType.schedulingType === SchedulingType.ROUND_ROBIN) {
      const bookingCounts = await this.getUserNameWithBookingCounts(
        this.eventType.id,
        ensureArray(this.organizer) || users.map((user) => user.username)
      );

      users = this.getLuckyUsers(users, bookingCounts);
    }
    this.users = users;
  }

  private async buildOrganizerFromUserId(userId: number) {
    const organizer = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      // select: {
      //   locale: true,
      // },
    });
    this.organizer = organizer;
  }

  private async setOrganizerLanguage(locale: string) {
    this.translationOwner = await getTranslation(locale ?? "en", "common");
  }

  // Round robbin related
  private getLuckyUsers(
    users: User[],
    bookingCounts: Prisma.PromiseReturnType<typeof this.getUserNameWithBookingCounts>
  ) {
    if (!bookingCounts.length) users.slice(0, 1);

    const [firstMostAvailableUser] = bookingCounts.sort((a, b) => (a.bookingCount > b.bookingCount ? 1 : -1));
    const luckyUser = users.find((user) => user.username === firstMostAvailableUser?.username);
    return luckyUser ? [luckyUser] : users;
  }

  private async getUserNameWithBookingCounts(eventTypeId: number, selectedUserNames: string[]) {
    const users = await prisma.user.findMany({
      where: {
        username: { in: selectedUserNames },
        eventTypes: {
          some: {
            id: eventTypeId,
          },
        },
      },
      select: {
        id: true,
        username: true,
        locale: true,
      },
    });

    const userNamesWithBookingCounts = await Promise.all(
      users.map(async (user) => ({
        username: user.username,
        bookingCount: await prisma.booking.count({
          where: {
            user: {
              id: user.id,
            },
            startTime: {
              gt: new Date(),
            },
            eventTypeId,
          },
        }),
      }))
    );

    return userNamesWithBookingCounts;
  }

  private buildInvitee() {
    this.invitee = [
      {
        email: this.attendee.email,
        name: this.attendee.name,
        timeZone: this.attendee.timeZone,
        language: { translate: this.translationAttendees, locale: this.attendee.language ?? "en" },
      },
    ];
  }

  private buildGuest() {
    const guests = this.guestsAttendees?.map((currentGuest: any) => {
      return {
        email: currentGuest,
        name: "",
        timeZone: this.timeZone,
        language: { translate: this.translationGuests, locale: "en" },
      };
    });
    this.guests = guests;
  }

  private buildUID() {
    const seed = `${this.users[0].username}:${dayjs(this.start).utc().format()}:${new Date().getTime()}`;
    const uid = translator.fromUUID(uuidv5(seed, uuidv5.URL));
    // @TODO: set UID from builder
  }

  private buildDescription() {
    this.description =
      this.notes +
      this.customInputs?.reduce(
        (str: any, input: any) => str + "<br /><br />" + input.label + ":<br />" + input.value,
        ""
      );
  }

  private buildEventNameObject() {
    this.eventNameObject = {
      attendeeName: this.eventName || "Nameless",
      eventType: this.eventType.title,
      eventName: this.eventType.eventName,
      host: this.users[0].name || "Nameless",
      t: this.translationOwner,
    };
  }

  private buildTeam() {
    if (this.eventType.schedulingType === SchedulingType.COLLECTIVE) {
      // this.builderSetTeam
      // evt.team = {
      //   members: users.map((user) => user.name || user.username || "Nameless"),
      //   name: eventType.team?.name || "Nameless",
      // }; // used for invitee emails
    }
  }

  private isTimeInPast(time: string): boolean {
    return dayjs(time).isBefore(new Date(), "day");
  }
}
