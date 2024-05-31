import type { TokenResponse } from "jsforce";
import jsforce from "jsforce";
import { RRule } from "rrule";
import { z } from "zod";

import { getLocation } from "@calcom/lib/CalEventParser";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { CRM, Contact, CrmEvent } from "@calcom/types/CrmService";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import type { ParseRefreshTokenResponse } from "../../_utils/oauth/parseRefreshTokenResponse";
import parseRefreshTokenResponse from "../../_utils/oauth/parseRefreshTokenResponse";

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

type ContactRecord = {
  Id: string;
  Email: string;
  OwnerId: string;
  [key: string]: any;
};

const salesforceTokenSchema = z.object({
  id: z.string(),
  issued_at: z.string(),
  instance_url: z.string(),
  signature: z.string(),
  access_token: z.string(),
  scope: z.string(),
  token_type: z.string(),
});

export default class SalesforceCRMService implements CRM {
  private integrationName = "";
  private conn: Promise<jsforce.Connection>;
  private log: typeof logger;
  private calWarnings: string[] = [];

  constructor(credential: CredentialPayload) {
    this.integrationName = "salesforce_other_calendar";
    this.conn = this.getClient(credential).then((c) => c);
    this.log = logger.getSubLogger({ prefix: [`[[lib] ${this.integrationName}`] });
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

    try {
      /* XXX: This code results in 'Bad Request', which indicates something is wrong with our salesforce integration.
              Needs further investigation ASAP */
      const response = await fetch("https://login.salesforce.com/services/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: consumer_key,
          client_secret: consumer_secret,
          refresh_token: credentialKey.refresh_token,
        }),
      });
      if (!response.ok) {
        const message = `${response.statusText}: ${JSON.stringify(await response.json())}`;
        throw new Error(message);
      }

      const accessTokenJson = await response.json();

      const accessTokenParsed: ParseRefreshTokenResponse<typeof salesforceTokenSchema> =
        parseRefreshTokenResponse(accessTokenJson, salesforceTokenSchema);

      await prisma.credential.update({
        where: { id: credential.id },
        data: { key: { ...accessTokenParsed, refresh_token: credentialKey.refresh_token } },
      });
    } catch (err: unknown) {
      console.error(err); // log but proceed
    }

    return new jsforce.Connection({
      clientId: consumer_key,
      clientSecret: consumer_secret,
      redirectUri: `${WEBAPP_URL}/api/integrations/salesforce/callback`,
      instanceUrl: credentialKey.instance_url,
      accessToken: credentialKey.access_token,
      refreshToken: credentialKey.refresh_token,
    });
  };

  private getSalesforceUserFromEmail = async (email: string) => {
    const conn = await this.conn;
    return await conn.query(`SELECT Id, Email FROM User WHERE Email = '${email}'`);
  };

  private getSalesforceUserFromOwnerId = async (ownerId: string) => {
    const conn = await this.conn;
    return await conn.query(`SELECT Id, Email FROM User WHERE Id = '${ownerId}'`);
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

  private salesforceCreateEvent = async (event: CalendarEvent, contacts: Contact[]) => {
    const createdEvent = await this.salesforceCreateEventApiCall(event, {
      EventWhoIds: contacts.map((contact) => contact.id),
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

  async handleEventCreation(event: CalendarEvent, contacts: Contact[]) {
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

  async createEvent(event: CalendarEvent, contacts: Contact[]): Promise<CrmEvent> {
    const sfEvent = await this.salesforceCreateEvent(event, contacts);
    if (sfEvent.success) {
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
    return Promise.reject("Something went wrong when creating an event in Salesforce");
  }

  async updateEvent(uid: string, event: CalendarEvent): Promise<CrmEvent> {
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

  public async deleteEvent(uid: string) {
    const deletedEvent = await this.salesforceDeleteEvent(uid);
    if (deletedEvent.success) {
      Promise.resolve();
    } else {
      Promise.reject({ calError: "Something went wrong when deleting the event in Salesforce" });
    }
  }

  async getContacts(email: string | string[], includeOwner?: boolean) {
    const conn = await this.conn;
    const emails = Array.isArray(email) ? email : [email];
    const soql = `SELECT Id, Email, OwnerId FROM Contact WHERE Email IN ('${emails.join("','")}')`;
    const results = await conn.query(soql);

    if (!results || !results.records.length) return [];

    const records = results.records as ContactRecord[];

    if (includeOwner) {
      const ownerIds: Set<string> = new Set();
      records.forEach((record) => {
        ownerIds.add(record.OwnerId);
      });

      const ownersQuery = (await Promise.all(
        Array.from(ownerIds).map(async (ownerId) => {
          return this.getSalesforceUserFromOwnerId(ownerId);
        })
      )) as { records: ContactRecord[] }[];
      const contactsWithOwners = records.map((record) => {
        const ownerEmail = ownersQuery.find((user) => user.records[0].Id === record.OwnerId)?.records[0]
          .Email;
        return { id: record.Id, email: record.Email, ownerId: record.OwnerId, ownerEmail };
      });
      return contactsWithOwners;
    }

    return records
      ? records.map((record) => ({
          id: record.Id,
          email: record.Email,
        }))
      : [];
  }

  async createContacts(contactsToCreate: { email: string; name: string }[], organizerEmail?: string) {
    const conn = await this.conn;

    // See if the organizer exists in the CRM
    let organizerId: string;
    if (organizerEmail) {
      const userQuery = await this.getSalesforceUserFromEmail(organizerEmail);
      if (userQuery) {
        organizerId = (userQuery.records[0] as { Email: string; Id: string }).Id;
      }
    }
    const createdContacts = await Promise.all(
      contactsToCreate.map(async (attendee) => {
        const [FirstName, LastName] = attendee.name ? attendee.name.split(" ") : [attendee.email, ""];
        return await conn
          .sobject("Contact")
          .create({
            FirstName,
            LastName: LastName || "-",
            Email: attendee.email,
            ...(organizerId && { OwnerId: organizerId }),
          })
          .then((result) => {
            if (result.success) {
              return { id: result.id, email: attendee.email };
            }
          });
      })
    );
    return createdContacts.filter((contact): contact is Contact => contact !== undefined);
  }
}
