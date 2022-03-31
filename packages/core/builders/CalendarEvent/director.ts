import { Booking, Prisma, SchedulingType } from "@prisma/client";
import dayjs from "dayjs";
import { Attendee } from "ics";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import prisma from "@calcom/prisma";
import { CalendarEvent, Person } from "@calcom/types/Calendar";

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

interface ICalendarEventDirector {
  booking: CustomBookingFromSelect;
  timeZone: any;
  start: any;
  end: any;
  eventTypeId: any;
  translationAttendees: string;
  translationOwner: any;
  translationGuests: any;
  attendee: any;
  guestAttendees: any;
  location: any;
  eventName: any;
  notes: any;
  customInputs: any;
}

interface CustomBookingFromSelect {
  id: number;
  startTime: string;
  endTime: string;
  userId: string;
  attendees: Partial<Attendee>[];
  eventTypeId: number | null;
}

export default class CalendarEventDirector {
  // Required props
  private booking: CustomBookingFromSelect;
  private attendee: any;
  private guestsAttendees: any;
  private start: any;
  private end: any;
  private eventName: any;
  private translationAttendees: any;
  private translationGuests: any;
  private translationOwner: any;
  private eventTypeId: any;
  private timeZone: any;
  private location: any;
  // private notes: string;
  private customInputs: any;

  // Internal control
  private builder: CalendarEvent | null;
  private eventType: any;
  private users: any;
  private organizer: any;
  private invitee?: Person[];
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
    this.booking = props.booking;
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
    // this.notes = props.notes;
    this.customInputs = props.customInputs;
    this.builder = null;
    this.guests = [] as Person[];
    this.attendeesList = [] as Person[];
  }

  public async buildRequiredParams() {
    if (this.isTimeInPast(this.start)) {
      throw new Error(`Booking ${this.eventTypeId} failed`);
    }
    const eventTypeId = this.booking.eventTypeId;

    await this.buildEventType(eventTypeId);

    await this.buildUsers(this.eventType.users);

    await this.buildOrganizerFromUserId(this.users[0].id);

    await this.setOrganizerLanguage(this.organizer?.language);

    this.buildInvitee();
    this.buildGuest();
    this.buildAttendeesList();
    // this.buildTeam();
    // this.buildUID();
    this.buildDescription();
    this.buildEventNameObject();

    this.builder = new CalendarEventBuilder({
      type: this.eventType.title,
      title: this.eventNameObject ? getEventName(this.eventNameObject) : "Nameless Event", //this needs to be either forced in english, or fetched for each attendee and organizer separately
      startTime: this.start,
      endTime: this.end,
      organizer: {
        name: this.organizer.name || "Nameless",
        email: this.organizer.email || "Email-less",
        timeZone: this.organizer.timeZone,
        language: { translate: this.translationOwner, locale: this.organizer?.locale ?? "en" },
      },
      attendees: this.attendeesList || [],
    }).get();
    return this.builder;
  }

  private async buildEventType(eventTypeId: number | null) {
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

  private async buildUsers(_users: User[]) {
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

  private async buildOrganizerFromUserId(userId: number) {
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

  private buildInvitee() {
    this.invitee = [
      {
        email: this.attendee[0].email,
        name: this.attendee[0].name,
        timeZone: this.attendee[0].timeZone,
        language: { translate: this.translationAttendees, locale: this.attendee[0].language ?? "en" },
      },
    ];
  }

  private buildGuest() {
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

  private buildTeam() {
    if (this.eventType.schedulingType === SchedulingType.COLLECTIVE) {
      // this.builderSetTeam
      // evt.team = {
      //   members: users.map((user) => user.name || user.username || "Nameless"),
      //   name: eventType.team?.name || "Nameless",
      // }; // used for invitee emails
    }
  }

  private buildAttendeesList() {
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

  private isTimeInPast(time: string): boolean {
    return dayjs(time).isBefore(new Date(), "day");
  }
}
