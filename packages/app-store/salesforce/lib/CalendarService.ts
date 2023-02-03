import jsforce, { TokenResponse } from "jsforce";
import { RRule } from "rrule";

import { getLocation } from "@calcom/lib/CalEventParser";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import type {
  Calendar,
  CalendarEvent,
  IntegrationCalendar,
  NewCalendarEventType,
  Person,
} from "@calcom/types/Calendar";
import { CredentialPayload } from "@calcom/types/Credential";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

type ExtendedTokenResponse = TokenResponse & {
  instance_url: string;
};

type ContactSearchResult = {
  attributes: {
    type: string;
    url: string;
  };
  Id: string;
  Email: string;
};

const sfApiErrors = {
  INVALID_EVENTWHOIDS: "INVALID_FIELD: No such column 'EventWhoIds' on sobject of type Event",
};

export default class SalesforceCalendarService implements Calendar {
  private integrationName = "";
  private conn: Promise<jsforce.Connection>;
  private log: typeof logger;
  private calWarnings: string[] = [];

  constructor(credential: CredentialPayload) {
    this.integrationName = "salesforce_other_calendar";
    this.conn = this.getClient(credential).then((c) => c);
    this.log = logger.getChildLogger({ prefix: [`[[lib] ${this.integrationName}`] });
  }

  private getClient = async (credential: CredentialPayload) => {
    let consumer_key = "";
    let consumer_secret = "";

    const appKeys = await getAppKeysFromSlug("salesforce");
    if (typeof appKeys.consumer_key === "string") consumer_key = appKeys.consumer_key;
    if (typeof appKeys.consumer_secret === "string") consumer_secret = appKeys.consumer_secret;
    if (!consumer_key)
      throw new HttpError({ statusCode: 400, message: "Salesforce consumer key is missing." });
    if (!consumer_secret)
      throw new HttpError({ statusCode: 400, message: "Salesforce consumer secret missing." });

    const credentialKey = credential.key as unknown as ExtendedTokenResponse;

    return new jsforce.Connection({
      clientId: consumer_key,
      clientSecret: consumer_secret,
      redirectUri: WEBAPP_URL + "/api/integrations/salesforce/callback",
      instanceUrl: credentialKey.instance_url,
      accessToken: credentialKey.access_token,
      refreshToken: credentialKey.refresh_token,
    });
  };

  private salesforceContactCreate = async (attendees: Person[]) => {
    const conn = await this.conn;
    const createdContacts = await Promise.all(
      attendees.map(async (attendee) => {
        const [FirstName, LastName] = attendee.name ? attendee.name.split(" ") : [attendee.email, ""];
        return await conn
          .sobject("Contact")
          .create({
            FirstName,
            LastName,
            Email: attendee.email,
          })
          .then((result) => {
            if (result.success) {
              return { Id: result.id, Email: attendee.email };
            }
          });
      })
    );
    return createdContacts.filter(
      (contact): contact is Omit<ContactSearchResult, "attributes"> => contact !== undefined
    );
  };

  private salesforceContactSearch = async (event: CalendarEvent) => {
    const conn = await this.conn;
    const search: ContactSearchResult[] = await conn.sobject("Contact").find(
      event.attendees.map((att) => ({ Email: att.email })),
      ["Id", "Email"]
    );
    return search;
  };

  private getSalesforceEventBody = (event: CalendarEvent): string => {
    return `${event.organizer.language.translate("invitee_timezone")}: ${
      event.attendees[0].timeZone
    } \r\n\r\n ${event.organizer.language.translate("share_additional_notes")}\r\n${
      event.additionalNotes || "-"
    }`;
  };

  private salesforceCreateEventApiCall = async (
    event: CalendarEvent,
    options: { [key: string]: unknown }
  ) => {
    const conn = await this.conn;
    return await conn.sobject("Event").create({
      StartDateTime: new Date(event.startTime).toISOString(),
      EndDateTime: new Date(event.endTime).toISOString(),
      Subject: event.title,
      Description: this.getSalesforceEventBody(event),
      Location: getLocation(event),
      ...options,
      ...(event.recurringEvent && {
        IsRecurrence2: true,
        Recurrence2PatternText: new RRule(event.recurringEvent).toString(),
      }),
    });
  };

  private salesforceCreateEvent = async (
    event: CalendarEvent,
    contacts: Omit<ContactSearchResult, "attributes">[]
  ) => {
    const createdEvent = await this.salesforceCreateEventApiCall(event, {
      EventWhoIds: contacts.map((contact) => contact.Id),
    }).catch(async (reason) => {
      if (reason === sfApiErrors.INVALID_EVENTWHOIDS) {
        this.calWarnings.push(
          `Please enable option "Allow Users to Relate Multiple Contacts to Tasks and Events" under
           "Setup > Feature Settings > Sales > Activity Settings" to be able to create events with
           multiple contact attendees.`
        );
        // User has not configured "Allow Users to Relate Multiple Contacts to Tasks and Events"
        // proceeding to create the event using just the first attendee as the primary WhoId
        return await this.salesforceCreateEventApiCall(event, {
          WhoId: contacts[0],
        });
      } else {
        return Promise.reject();
      }
    });
    return createdEvent;
  };

  private salesforceUpdateEvent = async (uid: string, event: CalendarEvent) => {
    const conn = await this.conn;
    return await conn.sobject("Event").update({
      Id: uid,
      StartDateTime: new Date(event.startTime).toISOString(),
      EndDateTime: new Date(event.endTime).toISOString(),
      Subject: event.title,
      Description: this.getSalesforceEventBody(event),
      Location: getLocation(event),
      ...(event.recurringEvent && {
        IsRecurrence2: true,
        Recurrence2PatternText: new RRule(event.recurringEvent).toString(),
      }),
    });
  };

  private salesforceDeleteEvent = async (uid: string) => {
    const conn = await this.conn;
    return await conn.sobject("Event").delete(uid);
  };

  async handleEventCreation(event: CalendarEvent, contacts: Omit<ContactSearchResult, "attributes">[]) {
    const sfEvent = await this.salesforceCreateEvent(event, contacts);
    if (sfEvent.success) {
      this.log.debug("event:creation:ok", { sfEvent });
      return Promise.resolve({
        uid: sfEvent.id,
        id: sfEvent.id,
        type: "salesforce_other_calendar",
        password: "",
        url: "",
        additionalInfo: { contacts, sfEvent, calWarnings: this.calWarnings },
      });
    }
    this.log.debug("event:creation:notOk", { event, sfEvent, contacts });
    return Promise.reject({
      calError: "Something went wrong when creating an event in Salesforce",
    });
  }

  async createEvent(event: CalendarEvent): Promise<NewCalendarEventType> {
    debugger;
    const contacts = await this.salesforceContactSearch(event);
    if (contacts.length) {
      if (contacts.length == event.attendees.length) {
        // All attendees do exist in Salesforce
        this.log.debug("contact:search:all", { event, contacts });
        return await this.handleEventCreation(event, contacts);
      } else {
        // Some attendees don't exist in Salesforce
        // Get the existing contacts' email to filter out
        this.log.debug("contact:search:notAll", { event, contacts });
        const existingContacts = contacts.map((contact) => contact.Email);
        this.log.debug("contact:filter:existing", { existingContacts });
        // Get non existing contacts filtering out existing from attendees
        const nonExistingContacts = event.attendees.filter(
          (attendee) => !existingContacts.includes(attendee.email)
        );
        this.log.debug("contact:filter:nonExisting", { nonExistingContacts });
        // Only create contacts in Salesforce that were not present in the previous contact search
        const createContacts = await this.salesforceContactCreate(nonExistingContacts);
        this.log.debug("contact:created", { createContacts });
        // Continue with event creation and association only when all contacts are present in Salesforce
        if (createContacts.length) {
          this.log.debug("contact:creation:ok");
          return await this.handleEventCreation(event, createContacts.concat(contacts));
        }
        return Promise.reject({
          calError: "Something went wrong when creating non-existing attendees in Salesforce",
        });
      }
    } else {
      this.log.debug("contact:search:none", { event, contacts });
      const createContacts = await this.salesforceContactCreate(event.attendees);
      this.log.debug("contact:created", { createContacts });
      if (createContacts.length) {
        this.log.debug("contact:creation:ok");
        return await this.handleEventCreation(event, createContacts);
      }
    }
    return Promise.reject({
      calError: "Something went wrong when searching/creating the attendees in Salesforce",
    });
  }

  async updateEvent(uid: string, event: CalendarEvent): Promise<NewCalendarEventType> {
    const updatedEvent = await this.salesforceUpdateEvent(uid, event);
    if (updatedEvent.success) {
      return Promise.resolve({
        uid: updatedEvent.id,
        id: updatedEvent.id,
        type: "salesforce_other_calendar",
        password: "",
        url: "",
        additionalInfo: { calWarnings: this.calWarnings },
      });
    } else {
      return Promise.reject({ calError: "Something went wrong when updating the event in Salesforce" });
    }
  }

  async deleteEvent(uid: string) {
    const deletedEvent = await this.salesforceDeleteEvent(uid);
    if (deletedEvent.success) {
      Promise.resolve();
    } else {
      Promise.reject({ calError: "Something went wrong when deleting the event in Salesforce" });
    }
  }

  async getAvailability(dateFrom: string, dateTo: string, selectedCalendars: IntegrationCalendar[]) {
    return Promise.resolve([]);
  }

  async listCalendars(event?: CalendarEvent) {
    return Promise.resolve([]);
  }
}
