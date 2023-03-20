import * as hubspot from "@hubspot/api-client";
import type { BatchInputPublicAssociation } from "@hubspot/api-client/lib/codegen/crm/associations";
import type { PublicObjectSearchRequest } from "@hubspot/api-client/lib/codegen/crm/contacts";
import type { SimplePublicObjectInput } from "@hubspot/api-client/lib/codegen/crm/objects/meetings";

import { getLocation } from "@calcom/lib/CalEventParser";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type {
  Calendar,
  CalendarEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
  Person,
} from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import type { HubspotToken } from "../api/callback";

const hubspotClient = new hubspot.Client();

export default class HubspotCalendarService implements Calendar {
  private url = "";
  private integrationName = "";
  private auth: Promise<{ getToken: () => Promise<any> }>;
  private log: typeof logger;
  private client_id = "";
  private client_secret = "";

  constructor(credential: CredentialPayload) {
    this.integrationName = "hubspot_other_calendar";

    this.auth = this.hubspotAuth(credential).then((r) => r);

    this.log = logger.getChildLogger({ prefix: [`[[lib] ${this.integrationName}`] });
  }

  private hubspotContactCreate = async (attendees: Person[]) => {
    const simplePublicObjectInputs: SimplePublicObjectInput[] = attendees.map((attendee) => {
      const [firstname, lastname] = attendee.name ? attendee.name.split(" ") : [attendee.email, ""];
      return {
        properties: {
          firstname,
          lastname,
          email: attendee.email,
        },
      };
    });
    return Promise.all(
      simplePublicObjectInputs.map((contact) =>
        hubspotClient.crm.contacts.basicApi.create(contact).catch((error) => {
          // If multiple events are created, subsequent events may fail due to
          // contact was created by previous event creation, so we introduce a
          // fallback taking advantage of the error message providing the contact id
          if (error.body.message.includes("Contact already exists. Existing ID:")) {
            const split = error.body.message.split("Contact already exists. Existing ID: ");
            return { id: split[1] };
          } else {
            throw error;
          }
        })
      )
    );
  };

  private hubspotContactSearch = async (event: CalendarEvent) => {
    const publicObjectSearchRequest: PublicObjectSearchRequest = {
      filterGroups: event.attendees.map((attendee) => ({
        filters: [
          {
            value: attendee.email,
            propertyName: "email",
            operator: "EQ",
          },
        ],
      })),
      sorts: ["hs_object_id"],
      properties: ["hs_object_id", "email"],
      limit: 10,
      after: 0,
    };

    return await hubspotClient.crm.contacts.searchApi
      .doSearch(publicObjectSearchRequest)
      .then((apiResponse) => apiResponse.results);
  };

  private getHubspotMeetingBody = (event: CalendarEvent): string => {
    return `<b>${event.organizer.language.translate("invitee_timezone")}:</b> ${
      event.attendees[0].timeZone
    }<br><br><b>${event.organizer.language.translate("share_additional_notes")}</b><br>${
      event.additionalNotes || "-"
    }`;
  };

  private hubspotCreateMeeting = async (event: CalendarEvent) => {
    const simplePublicObjectInput: SimplePublicObjectInput = {
      properties: {
        hs_timestamp: Date.now().toString(),
        hs_meeting_title: event.title,
        hs_meeting_body: this.getHubspotMeetingBody(event),
        hs_meeting_location: getLocation(event),
        hs_meeting_start_time: new Date(event.startTime).toISOString(),
        hs_meeting_end_time: new Date(event.endTime).toISOString(),
        hs_meeting_outcome: "SCHEDULED",
      },
    };

    return hubspotClient.crm.objects.meetings.basicApi.create(simplePublicObjectInput);
  };

  private hubspotAssociate = async (meeting: any, contacts: any) => {
    const batchInputPublicAssociation: BatchInputPublicAssociation = {
      inputs: contacts.map((contact: any) => ({
        _from: { id: meeting.id },
        to: { id: contact.id },
        type: "meeting_event_to_contact",
      })),
    };
    return hubspotClient.crm.associations.batchApi.create(
      "meetings",
      "contacts",
      batchInputPublicAssociation
    );
  };

  private hubspotUpdateMeeting = async (uid: string, event: CalendarEvent) => {
    const simplePublicObjectInput: SimplePublicObjectInput = {
      properties: {
        hs_timestamp: Date.now().toString(),
        hs_meeting_title: event.title,
        hs_meeting_body: this.getHubspotMeetingBody(event),
        hs_meeting_location: getLocation(event),
        hs_meeting_start_time: new Date(event.startTime).toISOString(),
        hs_meeting_end_time: new Date(event.endTime).toISOString(),
        hs_meeting_outcome: "RESCHEDULED",
      },
    };

    return hubspotClient.crm.objects.meetings.basicApi.update(uid, simplePublicObjectInput);
  };

  private hubspotDeleteMeeting = async (uid: string) => {
    return hubspotClient.crm.objects.meetings.basicApi.archive(uid);
  };

  private hubspotAuth = async (credential: CredentialPayload) => {
    const appKeys = await getAppKeysFromSlug("hubspot");
    if (typeof appKeys.client_id === "string") this.client_id = appKeys.client_id;
    if (typeof appKeys.client_secret === "string") this.client_secret = appKeys.client_secret;
    if (!this.client_id) throw new HttpError({ statusCode: 400, message: "Hubspot client_id missing." });
    if (!this.client_secret)
      throw new HttpError({ statusCode: 400, message: "Hubspot client_secret missing." });
    const credentialKey = credential.key as unknown as HubspotToken;
    const isTokenValid = (token: HubspotToken) =>
      token &&
      token.tokenType &&
      token.accessToken &&
      token.expiryDate &&
      (token.expiresIn || token.expiryDate) < Date.now();

    const refreshAccessToken = async (refreshToken: string) => {
      try {
        const hubspotRefreshToken: HubspotToken = await hubspotClient.oauth.tokensApi.createToken(
          "refresh_token",
          undefined,
          WEBAPP_URL + "/api/integrations/hubspot/callback",
          this.client_id,
          this.client_secret,
          refreshToken
        );

        // set expiry date as offset from current time.
        hubspotRefreshToken.expiryDate = Math.round(Date.now() + hubspotRefreshToken.expiresIn * 1000);
        await prisma.credential.update({
          where: {
            id: credential.id,
          },
          data: {
            key: hubspotRefreshToken as any,
          },
        });

        hubspotClient.setAccessToken(hubspotRefreshToken.accessToken);
      } catch (e: unknown) {
        this.log.error(e);
      }
    };

    return {
      getToken: () =>
        !isTokenValid(credentialKey) ? Promise.resolve([]) : refreshAccessToken(credentialKey.refreshToken),
    };
  };

  async handleMeetingCreation(event: CalendarEvent, contacts: SimplePublicObjectInput[]) {
    const meetingEvent = await this.hubspotCreateMeeting(event);
    if (meetingEvent) {
      this.log.debug("meeting:creation:ok", { meetingEvent });
      const associatedMeeting = await this.hubspotAssociate(meetingEvent, contacts);
      if (associatedMeeting) {
        this.log.debug("association:creation:ok", { associatedMeeting });
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
    this.log.debug("meeting:creation:notOk", { meetingEvent, event, contacts });
    return Promise.reject("Something went wrong when creating a meeting in HubSpot");
  }

  async createEvent(event: CalendarEvent): Promise<NewCalendarEventType> {
    const auth = await this.auth;
    await auth.getToken();
    const contacts = await this.hubspotContactSearch(event);
    if (contacts.length) {
      if (contacts.length == event.attendees.length) {
        // All attendees do exist in HubSpot
        this.log.debug("contact:search:all", { event, contacts });
        return await this.handleMeetingCreation(event, contacts);
      } else {
        // Some attendees don't exist in HubSpot
        // Get the existing contacts' email to filter out
        this.log.debug("contact:search:notAll", { event, contacts });
        const existingContacts = contacts.map((contact) => contact.properties.email);
        this.log.debug("contact:filter:existing", { existingContacts });
        // Get non existing contacts filtering out existing from attendees
        const nonExistingContacts = event.attendees.filter(
          (attendee) => !existingContacts.includes(attendee.email)
        );
        this.log.debug("contact:filter:nonExisting", { nonExistingContacts });
        // Only create contacts in HubSpot that were not present in the previous contact search
        const createContacts = await this.hubspotContactCreate(nonExistingContacts);
        this.log.debug("contact:created", { createContacts });
        // Continue with meeting creation and association only when all contacts are present in HubSpot
        if (createContacts.length) {
          this.log.debug("contact:creation:ok");
          return await this.handleMeetingCreation(
            event,
            createContacts.concat(contacts) as SimplePublicObjectInput[]
          );
        }
        return Promise.reject("Something went wrong when creating non-existing attendees in HubSpot");
      }
    } else {
      this.log.debug("contact:search:none", { event, contacts });
      const createContacts = await this.hubspotContactCreate(event.attendees);
      this.log.debug("contact:created", { createContacts });
      if (createContacts.length) {
        this.log.debug("contact:creation:ok");
        return await this.handleMeetingCreation(event, createContacts as SimplePublicObjectInput[]);
      }
    }
    return Promise.reject("Something went wrong when searching/creating the attendees in HubSpot");
  }

  async updateEvent(uid: string, event: CalendarEvent): Promise<any> {
    const auth = await this.auth;
    await auth.getToken();
    return await this.hubspotUpdateMeeting(uid, event);
  }

  async deleteEvent(uid: string): Promise<void> {
    const auth = await this.auth;
    await auth.getToken();
    return await this.hubspotDeleteMeeting(uid);
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
