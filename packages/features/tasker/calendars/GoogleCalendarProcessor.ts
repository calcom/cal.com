import GoogleCalendarService from "@calcom/app-store/googlecalendar/lib/CalendarService";
import type { CredentialForCalendarServiceWithEmail } from "@calcom/app-store/googlecalendar/lib/CalendarService";
import dayjs from "@calcom/dayjs";
import { addVideoCallDataToEvent } from "@calcom/features/bookings/lib/handleNewBooking/addVideoCallDataToEvent";
import { getRichDescription } from "@calcom/lib/CalEventParser";
import { processLocation } from "@calcom/lib/CalEventParser";
import { getEventName } from "@calcom/lib/event";
import { getBookerBaseUrl } from "@calcom/lib/getBookerBaseUrl";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import { prisma } from "@calcom/prisma";
import type { NewCalendarEventType, CalendarEvent } from "@calcom/types/Calendar";

export interface GoogleCalendarEvent extends CalendarEvent {
  calendarDescription?: string;
  seatsPerTimeSlot?: number;
  seatsShowAttendees?: boolean;
  hideCalendarEventDetails?: boolean;
  recurringEvent?: any;
  existingRecurringEvent?: any;
  iCalUID?: string;
  type: string;
}

export class GoogleCalendarProcessor {
  private credentialId: number;
  private delegationCredentialId?: string;
  private externalCalendarId?: string;

  constructor({
    credentialId,
    delegationCredentialId,
    externalCalendarId,
  }: {
    credentialId: number;
    delegationCredentialId?: string;
    externalCalendarId?: string;
  }) {
    this.credentialId = credentialId;
    this.delegationCredentialId = delegationCredentialId;
    this.externalCalendarId = externalCalendarId;
  }

  async build({
    bookingUid,
    credentialId,
    delegationCredentialId,
    userId,
    teamId,
    schedulingType,
    externalCalendarId,
    seatsPerTimeSlot,
    seatsShowAttendees,
    hideCalendarEventDetails,
    recurringEvent,
    existingRecurringEvent,
    iCalUID,
    type,
  }: {
    bookingUid: string;
    credentialId?: number;
    delegationCredentialId?: string;
    userId: number;
    teamId?: number;
    schedulingType?: "COLLECTIVE" | "ROUND_ROBIN";
    externalCalendarId?: string;
    seatsPerTimeSlot: GoogleCalendarEvent["seatsPerTimeSlot"];
    seatsShowAttendees: GoogleCalendarEvent["seatsShowAttendees"];
    hideCalendarEventDetails: GoogleCalendarEvent["hideCalendarEventDetails"];
    recurringEvent: GoogleCalendarEvent["recurringEvent"];
    existingRecurringEvent: GoogleCalendarEvent["existingRecurringEvent"];
    iCalUID: GoogleCalendarEvent["iCalUID"];
    type: GoogleCalendarEvent["type"];
  }): Promise<GoogleCalendarEvent> {
    const booking = await prisma.booking.findUnique({
      where: { uid: bookingUid },
      select: {
        id: true,
        uid: true,
        title: true,
        description: true,
        startTime: true,
        endTime: true,
        location: true,
        userId: true,
        eventTypeId: true,
        attendees: {
          select: {
            email: true,
            locale: true,
            name: true,
            timeZone: true,
            phoneNumber: true,
          },
        },
        references: true,
      },
    });

    if (!booking) {
      throw new Error(`Booking not found: ${bookingUid}`);
    }

    const organizerUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        locale: true,
        username: true,
        timeZone: true,
        timeFormat: true,
        destinationCalendar: true,
        profiles: {
          select: {
            organizationId: true,
          },
        },
      },
    });

    if (!organizerUser) {
      throw new Error(`Organizer user not found: ${userId}`);
    }

    let teamMembers: any[] = [];
    let teamDestinationCalendars: any[] = [];
    let teamObject: CalendarEvent["team"] = undefined;

    if (teamId) {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: {
          id: true,
          name: true,
          parentId: true,
          members: {
            select: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  locale: true,
                  username: true,
                  timeZone: true,
                  timeFormat: true,
                  destinationCalendar: true,
                },
              },
              role: true,
            },
          },
        },
      });

      if (!team) {
        throw new Error(`Team not found: ${teamId}`);
      }

      const allTeamUsers = team.members.map((member) => member.user);

      if (schedulingType === "COLLECTIVE") {
        teamMembers = allTeamUsers;
      } else if (schedulingType === "ROUND_ROBIN") {
        teamMembers = allTeamUsers.filter((user) => user.id === userId);
      } else {
        teamMembers = allTeamUsers;
      }

      if (schedulingType === "COLLECTIVE" && teamMembers.length > 0) {
        const teamMemberIds = teamMembers.map((member) => member.id);

        teamDestinationCalendars = await prisma.destinationCalendar.findMany({
          where: {
            AND: [
              {
                OR: [{ eventTypeId: booking.eventTypeId }, { userId: { in: teamMemberIds } }],
              },
              {
                OR: [
                  credentialId ? { credentialId: credentialId } : {},
                  delegationCredentialId ? { delegationCredentialId: delegationCredentialId } : {},
                ].filter((condition) => Object.keys(condition).length > 0),
              },
            ],
          },
        });
      }

      const teamMemberPromises = teamMembers.map(async (member) => ({
        id: member.id,
        name: member.name || "Nameless",
        email: member.email,
        username: member.username || undefined,
        timeZone: member.timeZone,
        language: {
          translate: await getTranslation(member.locale ?? "en", "common"),
          locale: member.locale ?? "en",
        },
        timeFormat: getTimeFormatStringFromUserTimeFormat(member.timeFormat),
      }));

      const translatedTeamMembers = await Promise.all(teamMemberPromises);

      teamObject = {
        id: team.id,
        name: team.name,
        members: translatedTeamMembers,
      };
    }

    let delegationCredential = null;
    if (delegationCredentialId) {
      delegationCredential = await prisma.delegationCredential.findUnique({
        where: { id: delegationCredentialId },
        select: {
          id: true,
          organizationId: true,
          serviceAccountKey: true,
        },
      });

      const userOrganizationIds = organizerUser.profiles.map((p) => p.organizationId);
      if (delegationCredential && !userOrganizationIds.includes(delegationCredential.organizationId)) {
        throw new Error(`User ${userId} not authorized for delegation credential ${delegationCredentialId}`);
      }
    }

    const organizerDestinationCalendars = await prisma.destinationCalendar.findMany({
      where: {
        AND: [
          {
            OR: [{ eventTypeId: booking.eventTypeId }, { userId: userId }],
          },
          {
            OR: [
              credentialId ? { credentialId: credentialId } : {},
              delegationCredentialId ? { delegationCredentialId: delegationCredentialId } : {},
            ].filter((condition) => Object.keys(condition).length > 0),
          },
        ],
      },
    });

    const allDestinationCalendars = [...organizerDestinationCalendars, ...teamDestinationCalendars];

    const finalDestinationCalendar =
      allDestinationCalendars.length > 0
        ? allDestinationCalendars
        : organizerUser.destinationCalendar
        ? [organizerUser.destinationCalendar]
        : [];

    const organizerEmail = organizerUser.email || "Email-less";

    const attendeePromises = booking.attendees.map(async (attendee) => ({
      email: attendee.email,
      name: attendee.name,
      timeZone: attendee.timeZone,
      language: {
        translate: await getTranslation(attendee.locale ?? "en", "common"),
        locale: attendee.locale ?? "en",
      },
      phoneNumber: attendee.phoneNumber || undefined,
    }));

    const attendeesList = await Promise.all(attendeePromises);

    const organizerTranslation = await getTranslation(organizerUser.locale ?? "en", "common");
    const organizer = {
      id: organizerUser.id,
      name: organizerUser.name || "Nameless",
      email: organizerEmail,
      username: organizerUser.username || undefined,
      timeZone: organizerUser.timeZone,
      language: {
        translate: organizerTranslation,
        locale: organizerUser.locale ?? "en",
      },
      timeFormat: getTimeFormatStringFromUserTimeFormat(organizerUser.timeFormat),
    };

    const organizerOrganizationId = organizerUser.profiles[0]?.organizationId;
    const teamParentId = teamObject?.id
      ? (await prisma.team.findUnique({ where: { id: teamObject.id }, select: { parentId: true } }))?.parentId
      : null;

    const bookerUrl = await getBookerBaseUrl(teamParentId ?? organizerOrganizationId ?? null);

    const eventNameObject = {
      attendeeName: booking.attendees[0]?.name || "Nameless",
      eventType: type,
      eventName: booking.title || type,
      teamName: schedulingType === "COLLECTIVE" ? teamObject?.name : null,
      host: organizerUser.name || "Nameless",
      location: booking.location,
      eventDuration: dayjs(booking.endTime).diff(booking.startTime, "minutes"),
      bookingFields: {},
      t: organizerTranslation,
    };
    const eventName = getEventName(eventNameObject);

    let calendarEvent: GoogleCalendarEvent = {
      title: eventName,
      startTime: dayjs(booking.startTime).utc().format(),
      endTime: dayjs(booking.endTime).utc().format(),

      organizer,
      attendees: attendeesList,

      location: booking.location,
      destinationCalendar: finalDestinationCalendar,

      team: teamObject,

      seatsPerTimeSlot,
      seatsShowAttendees,
      hideCalendarEventDetails,
      recurringEvent,
      existingRecurringEvent,
      iCalUID,
      type,

      description: booking.description || "",
      uid: booking.uid,
      eventTypeId: booking.eventTypeId,
      bookingId: booking.id,
    };

    calendarEvent = {
      ...addVideoCallDataToEvent(booking.references, calendarEvent),
    };

    calendarEvent = {
      ...processLocation(calendarEvent),
    };

    calendarEvent.calendarDescription = getRichDescription(calendarEvent);

    return calendarEvent;
  }

  async create(event: GoogleCalendarEvent): Promise<NewCalendarEventType> {
    let credential: CredentialForCalendarServiceWithEmail;

    if (this.delegationCredentialId) {
      const delegationCredential = await prisma.delegationCredential.findUnique({
        where: { id: this.delegationCredentialId },
        select: {
          id: true,
          organizationId: true,
          serviceAccountKey: true,
          type: true,
        },
      });

      if (!delegationCredential) {
        throw new Error(`Delegation credential not found: ${this.delegationCredentialId}`);
      }

      credential = {
        id: parseInt(this.delegationCredentialId),
        type: delegationCredential.type,
        key: delegationCredential.serviceAccountKey,
        userId: null, // Delegation credentials don't have userId
        appId: "google-calendar",
        invalid: false,
        user: {
          email: "", // Will be determined by service account
        },
      };
    } else {
      const regularCredential = await prisma.credential.findUnique({
        where: { id: this.credentialId },
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      });

      if (!regularCredential) {
        throw new Error(`Credential not found: ${this.credentialId}`);
      }

      credential = {
        id: regularCredential.id,
        type: regularCredential.type,
        key: regularCredential.key,
        userId: regularCredential.userId,
        appId: regularCredential.appId,
        invalid: regularCredential.invalid,
        user: {
          email: regularCredential.user?.email || "",
        },
      };
    }

    const calendarService = new GoogleCalendarService(credential);

    try {
      const result = await calendarService.createEvent(event, this.credentialId, this.externalCalendarId);

      return result;
    } catch (error) {
      console.error("Failed to create Google Calendar event:", {
        credentialId: this.credentialId,
        delegationCredentialId: this.delegationCredentialId,
        externalCalendarId: this.externalCalendarId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async buildAndCreate({
    bookingUid,
    credentialId,
    delegationCredentialId,
    userId,
    teamId,
    schedulingType,
    externalCalendarId,
    seatsPerTimeSlot,
    seatsShowAttendees,
    hideCalendarEventDetails,
    recurringEvent,
    existingRecurringEvent,
    iCalUID,
    type,
  }: {
    bookingUid: string;
    credentialId?: number;
    delegationCredentialId?: string;
    userId: number;
    teamId?: number;
    schedulingType?: "COLLECTIVE" | "ROUND_ROBIN";
    externalCalendarId?: string;
    seatsPerTimeSlot: GoogleCalendarEvent["seatsPerTimeSlot"];
    seatsShowAttendees: GoogleCalendarEvent["seatsShowAttendees"];
    hideCalendarEventDetails: GoogleCalendarEvent["hideCalendarEventDetails"];
    recurringEvent: GoogleCalendarEvent["recurringEvent"];
    existingRecurringEvent: GoogleCalendarEvent["existingRecurringEvent"];
    iCalUID: GoogleCalendarEvent["iCalUID"];
    type: GoogleCalendarEvent["type"];
  }): Promise<NewCalendarEventType> {
    const event = await this.build({
      bookingUid,
      credentialId,
      delegationCredentialId,
      userId,
      teamId,
      schedulingType,
      externalCalendarId,
      seatsPerTimeSlot,
      seatsShowAttendees,
      hideCalendarEventDetails,
      recurringEvent,
      existingRecurringEvent,
      iCalUID,
      type,
    });

    return await this.create(event);
  }
}
