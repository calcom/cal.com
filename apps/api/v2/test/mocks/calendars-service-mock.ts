import { CalendarsService } from "@/ee/calendars/services/calendars.service";

import { ICS_CALENDAR_ID, ICS_CALENDAR_TYPE } from "@calcom/platform-constants";

export class CalendarsServiceMock {
  async getCalendars() {
    return {
      connectedCalendars: [
        {
          integration: {
            installed: false,
            type: "google_calendar",
            title: "",
            name: "",
            description: "",
            variant: "calendar",
            slug: "",
            locationOption: null,
            categories: ["calendar"],
            logo: "",
            publisher: "",
            url: "",
            email: "",
          },
          credentialId: 1,
          error: { message: "" },
        },
        {
          integration: {
            installed: false,
            type: "office365_calendar",
            title: "",
            name: "",
            description: "",
            variant: "calendar",
            slug: "",
            locationOption: null,
            categories: ["calendar"],
            logo: "",
            publisher: "",
            url: "",
            email: "",
          },
          credentialId: 2,
          error: { message: "" },
        },
        {
          integration: {
            installed: false,
            type: ICS_CALENDAR_TYPE,
            title: "ics-feed_calendar",
            name: "ics-feed_calendar",
            description: "",
            variant: "calendar",
            slug: ICS_CALENDAR_ID,
            locationOption: null,
            categories: ["calendar"],
            logo: "",
            publisher: "",
            url: "",
            email: "",
          },
          credentialId: 2,
          error: { message: "" },
        },
      ],
      destinationCalendar: {
        name: "destinationCalendar",
        eventTypeId: 1,
        credentialId: 1,
        primaryEmail: "primaryEmail",
        integration: "google_calendar",
        externalId: "externalId",
        userId: null,
        id: 0,
        delegationCredentialId: null,
        domainWideDelegationCredentialId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        customCalendarReminder: 10,
      },
    } satisfies Awaited<ReturnType<typeof CalendarsService.prototype.getCalendars>>;
  }
}
