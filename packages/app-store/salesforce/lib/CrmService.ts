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
import { SalesforceRecordEnum } from "./recordEnum";

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
  private appOptions: any;
  private doNotCreateEvent = false;

  constructor(credential: CredentialPayload, appOptions: any) {
    this.integrationName = "salesforce_other_calendar";
    this.conn = this.getClient(credential).then((c) => c);
    this.log = logger.getSubLogger({ prefix: [`[[lib] ${this.integrationName}`] });
    this.appOptions = appOptions;
  }

  public getAppOptions() {
    return this.appOptions;
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

  private getSalesforceUserIdFromEmail = async (email: string) => {
    const conn = await this.conn;
    const query = await conn.query(`SELECT Id, Email FROM User WHERE Email = '${email}'`);
    if (query.records.length > 0) {
      return (query.records[0] as { Email: string; Id: string }).Id;
    }
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
    const ownerId = await this.getSalesforceUserIdFromEmail(event.organizer.email);

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
      ...(ownerId && { OwnerId: ownerId }),
    });
  };

  private salesforceCreateEvent = async (event: CalendarEvent, contacts: Contact[]) => {
    const appOptions = this.getAppOptions();

    const customFieldInputsEnabled =
      appOptions?.onBookingWriteToEventObject && appOptions?.onBookingWriteToEventObjectMap;

    const customFieldInputs = customFieldInputsEnabled
      ? await this.ensureFieldsExistOnObject(Object.keys(appOptions?.onBookingWriteToEventObjectMap), "Event")
      : [];

    const confirmedCustomFieldInputs: {
      [key: string]: any;
    } = {};

    for (const field of customFieldInputs) {
      confirmedCustomFieldInputs[field] = appOptions.onBookingWriteToEventObjectMap[field];
    }

    const createdEvent = await this.salesforceCreateEventApiCall(event, {
      EventWhoIds: contacts.map((contact) => contact.id),
      ...confirmedCustomFieldInputs,
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

  async createEvent(event: CalendarEvent, contacts: Contact[]): Promise<CrmEvent | undefined> {
    const skipEventCreation = this.getDoNotCreateEvent();
    if (skipEventCreation) return undefined;

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

  async getContacts({
    emails,
    includeOwner,
    forRoundRobinSkip,
  }: {
    emails: string | string[];
    includeOwner?: boolean;
    forRoundRobinSkip?: boolean;
  }) {
    const conn = await this.conn;
    const emailArray = Array.isArray(emails) ? emails : [emails];
    const appOptions = this.getAppOptions();
    const recordToSearch =
      (forRoundRobinSkip ? appOptions?.roundRobinSkipCheckRecordOn : appOptions?.createEventOn) ??
      SalesforceRecordEnum.CONTACT;
    let soql: string;
    if (recordToSearch === SalesforceRecordEnum.ACCOUNT) {
      // For an account let's assume that the first email is the one we should be querying against
      const attendeeEmail = emailArray[0];
      soql = `SELECT Id, Email, OwnerId, AccountId FROM Contact WHERE Email = '${attendeeEmail}' AND AccountId != null`;

      // If this is for a round robin skip then we need to return the account record
      if (forRoundRobinSkip) {
        const results = await conn.query(soql);
        if (results.records.length) {
          const contact = results.records[0] as { AccountId: string };
          soql = `SELECT Id, OwnerId FROM Account WHERE Id = '${contact.AccountId}'`;
        }
      }
      // If creating events on contacts or leads
    } else {
      soql = `SELECT Id, Email, OwnerId FROM ${recordToSearch} WHERE Email IN ('${emailArray.join("','")}')`;
    }
    const results = await conn.query(soql);

    if (!results || !results.records.length) return [];

    const records = results.records as ContactRecord[];

    if (includeOwner || forRoundRobinSkip) {
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
    const appOptions = this.getAppOptions();
    const createEventOn = appOptions.createEventOn ?? SalesforceRecordEnum.CONTACT;
    const organizerId = organizerEmail ? await this.getSalesforceUserIdFromEmail(organizerEmail) : undefined;
    const createdContacts: { id: string; email: string }[] = [];

    if (createEventOn === SalesforceRecordEnum.CONTACT || createEventOn === SalesforceRecordEnum.LEAD) {
      // See if the organizer exists in the CRM
      await Promise.all(
        contactsToCreate.map(async (attendee) => {
          return await conn
            .sobject(createEventOn)
            .create(
              this.generateCreateRecordBody({
                attendee,
                recordType: createEventOn,
                organizerId,
              })
            )
            .then((result) => {
              if (result.success) {
                createdContacts.push({ id: result.id, email: attendee.email });
              }
            });
        })
      );
    }

    if (createEventOn === SalesforceRecordEnum.ACCOUNT) {
      if (!appOptions.createNewContactUnderAccount && !appOptions.createLeadIfAccountNull) {
        this.setDoNotCreateEvent(true);
        return [{ id: "Do not create event", email: "placeholder" }];
      }

      // Base this off of the first contact
      const attendee = contactsToCreate[0];

      const emailDomain = attendee.email.split("@")[1];

      const response = await conn.query(
        `SELECT Id, Email, AccountId FROM Contact WHERE Email LIKE '%@${emailDomain}' AND AccountId != null`
      );

      const accountId = this.getDominantAccountId(response.records as { AccountId: string }[]);

      if (accountId && appOptions.createNewContactUnderAccount) {
        // First see if the contact already exists and connect it to the account
        const userQuery = await conn.query(`SELECT Id, Email FROM Contact WHERE Email = '${attendee.email}'`);
        if (userQuery.records.length) {
          const contact = userQuery.records[0] as { Id: string; Email: string };
          await conn.sobject(SalesforceRecordEnum.CONTACT).update({
            // The first argument is the WHERE clause
            Id: contact.Id,
            AccountId: accountId,
          });
          return [{ id: contact.Id, email: contact.Email }];
        }

        await conn
          .sobject(SalesforceRecordEnum.CONTACT)
          .create({
            ...this.generateCreateRecordBody({
              attendee,
              recordType: SalesforceRecordEnum.CONTACT,
              organizerId,
            }),
            AccountId: accountId,
          })
          .then((result) => {
            if (result.success) {
              createdContacts.push({ id: result.id, email: attendee.email });
            }
          });
      }

      if (appOptions.createLeadIfAccountNull) {
        // Check to see if the lead exists already
        const leadQuery = await conn.query(`SELECT Id, Email FROM Lead WHERE Email = '${attendee.email}'`);
        if (leadQuery.records.length) {
          const contact = leadQuery.records[0] as { Id: string; Email: string };
          return [{ id: contact.Id, email: contact.Email }];
        }

        for (const attendee of contactsToCreate) {
          try {
            const result = await conn.sobject(SalesforceRecordEnum.LEAD).create(
              this.generateCreateRecordBody({
                attendee,
                recordType: SalesforceRecordEnum.LEAD,
                organizerId,
              })
            );
            if (result.success) {
              createdContacts.push({ id: result.id, email: attendee.email });
            }
          } catch (error: any) {
            if (error.name === "DUPLICATES_DETECTED") {
              const existingId = this.getExistingIdFromDuplicateError(error);
              if (existingId) {
                console.log("Using existing record:", existingId);
                createdContacts.push({ id: existingId, email: attendee.email });
              }
            } else {
              console.error("Error creating lead:", error);
            }
          }
        }
      }
    }

    return createdContacts;
  }

  private getExistingIdFromDuplicateError(error: any): string | null {
    if (error.duplicateResult && error.duplicateResult.matchResults) {
      for (const matchResult of error.duplicateResult.matchResults) {
        if (matchResult.matchRecords && matchResult.matchRecords.length > 0) {
          return matchResult.matchRecords[0].record.Id;
        }
      }
    }
    return null;
  }

  private setDoNotCreateEvent(boolean: boolean) {
    this.doNotCreateEvent = boolean;
  }

  private getDoNotCreateEvent() {
    return this.doNotCreateEvent;
  }

  private getDominantAccountId(contacts: { AccountId: string }[]) {
    // To get the dominant AccountId we only need to iterate through half the array
    const iterateLength = Math.ceil(contacts.length / 2);
    // Store AccountId frequencies
    const accountIdCounts: { [accountId: string]: number } = {};

    for (const contact of contacts) {
      const accountId = contact.AccountId;
      accountIdCounts[accountId] = (accountIdCounts[accountId] || 0) + 1;
      // If the number of AccountIds makes up 50% of the array length then return early
      if (accountIdCounts[accountId] > iterateLength) return accountId;
    }

    // Else figure out which AccountId occurs the most
    let dominantAccountId;
    let highestCount = 0;

    for (const accountId in accountIdCounts) {
      if (accountIdCounts[accountId] > highestCount) {
        highestCount = accountIdCounts[accountId];
        dominantAccountId = accountId;
      }
    }

    return dominantAccountId;
  }

  private generateCreateRecordBody({
    attendee,
    recordType,
    organizerId,
  }: {
    attendee: { email: string; name: string };
    recordType: SalesforceRecordEnum;
    organizerId?: string;
  }) {
    const [FirstName, LastName] = attendee.name ? attendee.name.split(" ") : [attendee.email, ""];

    // Assume that the first part of the email domain is the company title
    const company = attendee.email.split("@")[1].split(".")[0];

    return {
      LastName: LastName || "-",
      FirstName,
      Email: attendee.email,
      ...(organizerId && { OwnerId: organizerId }),
      ...(recordType === SalesforceRecordEnum.LEAD && { Company: company }),
    };
  }

  private async ensureFieldsExistOnObject(fieldsToTest: string[], sobject: string) {
    const conn = await this.conn;

    const fieldSet = new Set(fieldsToTest);
    const foundFields: string[] = [];

    try {
      const salesforceEntity = await conn.describe(sobject);
      const fields = salesforceEntity.fields;

      for (const field of fields) {
        if (foundFields.length === fieldSet.size) break;

        if (fieldSet.has(field.name)) {
          foundFields.push(field.name);
        }
      }

      return foundFields;
    } catch (e) {
      console.error(e);
      return [];
    }
  }
}
