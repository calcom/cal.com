import { Booking, Prisma, SchedulingType } from "@prisma/client";
import dayjs from "dayjs";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import prisma from "@calcom/prisma";
import { Person } from "@calcom/types/Calendar";

import { ensureArray } from "../../../../apps/web/lib/ensureArray";
import { getTranslation } from "../../../../apps/web/server/lib/i18n";
import CalendarEventClass from "./class";

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

// interface CustomBookingFromSelect {
//   id: number;
//   startTime: Date;
//   endTime: Date;
//   userId: number | null;
//   attendees: Partial<Person>[];
//   eventTypeId: number | null;
// }

interface ICalendarEventBuilder {
  // booking: CustomBookingFromSelect;
  timeZone: any;
  start: any;
  end: any;
  eventTypeId: any;
  translationAttendees: string;
  translationOwner: any;
  translationGuests: any;
  attendee: any;
  location: any;
  eventName: any;
  customInputs: any;
}

export class CalendarEventBuilder implements ICalendarEventBuilder {
  private event: CalendarEventClass | undefined;

  // Required props
  // public booking: CustomBookingFromSelect;
  public attendee: any;
  public guestsAttendees: any;
  public start: any;
  public end: any;
  public eventName: any;
  public translationAttendees: any;
  public translationGuests: any;
  public translationOwner: any;
  public eventTypeId: any;
  public timeZone: any;
  public location: any;
  // public notes: string;
  public customInputs: any;

  // Internal control
  public eventType: any;
  public users: any;
  public organizer: any;
  public invitee?: Person[];
  public guests?: Person[];
  public teamMembers?: Person[];
  public attendeesList?: Person[];
  public eventNameObject?: {
    attendeeName: string;
    eventType: string;
    eventName: string;
    host: string;
    // @TODO: TFunction;
    t: any;
  };
  private description?: string;

  constructor() {
    // setting initial as undefined
    this.reset();
  }

  public getEvent(): CalendarEventClass | undefined {
    return this.event;
  }

  public init(props: CalendarEventBuilder) {
    return new CalendarEventClass({
      type: this.eventTypeId,
      title: this.eventName,
      startTime: this.start,
      endTime: this.end,
      organizer: { name: "", email: "", language: { translate: () => {}, locale: "" }, timeZone: "" },
      attendees: this.attendee,
    });
  }

  public reset(): void {
    this.event = undefined;
  }

  public async buildEventType(eventTypeId: number | null) {
    if (eventTypeId === null) {
      throw new Error("Event Type Id not received");
    }
    let eventType;
    try {
      eventType = await prisma.eventType.findUnique({
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
    } catch (error) {
      console.log(error);
    }

    this.eventType = eventType;
  }

  public async buildUsers(_users: User[]) {
    let users = _users;
    if (!users.length && this.eventType.userId) {
      try {
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
      } catch (error) {
        console.log(error);
      }
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

  public async buildOrganizerFromUserId(userId: number) {
    let organizer;
    try {
      organizer = await prisma.user.findUnique({
        where: {
          id: userId,
        },
        // select: {
        //   locale: true,
        // },
      });
    } catch (error) {
      console.log(error);
    }
    this.organizer = organizer;
  }

  public async setOrganizerLanguage(locale: string) {
    this.translationOwner = await getTranslation(locale ?? "en", "common");
  }

  // Round robbin related
  public getLuckyUsers(users: User[], bookingCounts: []) {
    if (bookingCounts && !bookingCounts.length) {
      users.slice(0, 1);
    } else if (bookingCounts && bookingCounts.length >= 0) {
      const [firstMostAvailableUser] = bookingCounts.sort((a, b) =>
        a.bookingCount > b.bookingCount ? 1 : -1
      );
      const luckyUser = users.find((user) => user.username === firstMostAvailableUser?.username);
      return luckyUser ? [luckyUser] : users;
    }
  }

  public async getUserNameWithBookingCounts(eventTypeId: number, selectedUserNames: string[]) {
    let userNamesWithBookingCounts;
    try {
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

      userNamesWithBookingCounts = await Promise.all(
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
    } catch (error) {
      console.log(error);
    }

    return userNamesWithBookingCounts;
  }

  public buildInvitee() {
    this.invitee = [
      {
        email: this.attendee[0].email,
        name: this.attendee[0].name,
        timeZone: this.attendee[0].timeZone,
        language: { translate: this.translationAttendees, locale: this.attendee[0].language ?? "en" },
      },
    ];
  }

  public buildGuest() {
    const guests = this.attendee.slice(1);
    const guestsResult = this.attendeesList?.map((currentGuest: any) => {
      return {
        email: currentGuest,
        name: "",
        timeZone: this.timeZone,
        language: { translate: this.translationGuests, locale: "en" },
      };
    });
    this.guests = guestsResult;
  }

  public buildUID() {
    const seed = `${this.users[0].username}:${dayjs(this.start).utc().format()}:${new Date().getTime()}`;
    const uid = translator.fromUUID(uuidv5(seed, uuidv5.URL));
    // @TODO: set UID from builder
  }

  public buildDescription() {
    this.description =
      // this.notes +
      this.customInputs?.reduce(
        (str: any, input: any) => str + "<br /><br />" + input.label + ":<br />" + input.value,
        ""
      );
  }

  public buildEventNameObject() {
    // @NOTE: if multiple attendees should name be event with owner and attendeeList.map(item=>item.name).join(',')
    const attendeeNames =
      this.attendeesList && this.attendeesList?.length > 1
        ? this.attendeesList?.map((item) => item.name).join(", ")
        : this.attendee[0].name;
    console.log({ attendeeNames });
    this.eventNameObject = {
      attendeeName: attendeeNames || "Nameless",
      eventType: this.eventType.title,
      eventName: this.eventType.eventName,
      host: this.organizer.name || "Nameless",
      t: this.translationOwner,
    };
  }

  public buildTeam() {
    if (this.eventType.schedulingType === SchedulingType.COLLECTIVE) {
      // this.builderSetTeam
      // evt.team = {
      //   members: users.map((user) => user.name || user.username || "Nameless"),
      //   name: eventType.team?.name || "Nameless",
      // }; // used for invitee emails
    }
  }

  public buildAttendeesList() {
    this.attendeesList = [];
    if (this.invitee) {
      this.attendeesList.push(...this.invitee);
    }
    if (this.guests) {
      this.attendeesList.push(...this.guests);
    }
    if (this.teamMembers) {
      this.attendeesList.push(...this.teamMembers);
    }
  }

  public isTimeInPast(time: string): boolean {
    return dayjs(time).isBefore(new Date(), "day");
  }
}
