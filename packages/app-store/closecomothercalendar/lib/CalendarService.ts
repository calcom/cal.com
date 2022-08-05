import { Credential } from "@prisma/client";

import { getLocation } from "@calcom/lib/CalEventParser";
import CloseCom from "@calcom/lib/CloseCom";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { symmetricDecrypt } from "@calcom/lib/crypto";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type {
  Calendar,
  CalendarEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";

const CALENDSO_ENCRYPTION_KEY = process.env.CALENDSO_ENCRYPTION_KEY || "";

/**
 * -Authentication-
 * Close.com requires Basic Auth for any request to their APIs, which is far from
 * ideal considering that such a strategy requires generating an API Key by the
 * user and input it in our system. A Setup page was created when trying to install
 * Close.com App in order to instruct how to create such resource and to obtain it.
 *
 * -Meeting creation-
 * Close.com does not expose a "Meeting" API, it may be available in the future.
 *
 * In the meantime, we can use a "Custom Activity" for which a "Custom Activity Type"
 * needs to be created, to then create "Custom Activity Fields" attached to that
 * "Custom Activity Type".
 *
 * For this integration to work, the logic needs to check if a "Custom Activity Type"
 * already exists with the correspondant "Custom Activity Fields" to then proceed to
 * create a "Custom Activity" instance of that type for the user.
 */
export default class CloseComCalendarService implements Calendar {
  private integrationName = "";
  private closeCom: CloseCom;
  private log: typeof logger;

  constructor(credential: Credential) {
    this.integrationName = "closecom_other_calendar";

    const { userApiKey } = JSON.parse(
      symmetricDecrypt(credential.key.encrypted as string, CALENDSO_ENCRYPTION_KEY)
    );

    this.closeCom = new CloseCom(userApiKey);

    this.log = logger.getChildLogger({ prefix: [`[[lib] ${this.integrationName}`] });
  }

  private closeComContactSearch = async (event: CalendarEvent) => {};

  private getHubspotMeetingBody = (event: CalendarEvent): string => {
    return `<b>${event.organizer.language.translate("invitee_timezone")}:</b> ${
      event.attendees[0].timeZone
    }<br><br><b>${event.organizer.language.translate("share_additional_notes")}</b><br>${
      event.additionalNotes || "-"
    }`;
  };

  private closeComCreateCustomActivity = async (event: CalendarEvent) => {};

  private closeComUpdateCustomActivity = async (uid: string, event: CalendarEvent) => {};

  private closeComDeleteCustomActivity = async (uid: string) => {};

  async createEvent(event: CalendarEvent): Promise<NewCalendarEventType> {
    const auth = await this.auth;
    await auth.getToken();
    const contacts = await this.hubspotContactSearch(event);
    if (contacts) {
      const meetingEvent = await this.hubspotCreateMeeting(event);
      if (meetingEvent) {
        const associatedMeeting = await this.hubspotAssociate(meetingEvent, contacts);
        if (associatedMeeting) {
          return Promise.resolve({
            uid: meetingEvent.id,
            id: meetingEvent.id,
            type: "hubspot_other_calendar",
            password: "",
            url: "",
            additionalInfo: { contacts, associatedMeeting },
          });
        }
        return Promise.reject("Something went wrong when associating the meeting and attendees in HubSpot");
      }
      return Promise.reject("Something went wrong when creating a meeting in HubSpot");
    }
    return Promise.reject("Something went wrong when searching the atendee in HubSpot");
  }

  async updateEvent(uid: string, event: CalendarEvent): Promise<any> {
    return await this.closeComUpdateCustomActivity(uid, event);
  }

  async deleteEvent(uid: string): Promise<void> {
    return await this.closeComDeleteCustomActivity(uid);
  }

  async getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[]
  ): Promise<EventBusyDate[]> {
    return Promise.resolve([]);
  }

  async listCalendars(event?: CalendarEvent): Promise<IntegrationCalendar[]> {
    return Promise.resolve([]);
  }
}
