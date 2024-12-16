import type { TokenResponse } from "jsforce";
import jsforce from "jsforce";
import { RRule } from "rrule";
import { z } from "zod";

import type { FormResponse } from "@calcom/app-store/routing-forms/types/types";
import { getLocation } from "@calcom/lib/CalEventParser";
import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { CalendarEvent, CalEventResponses } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { CRM, Contact, CrmEvent } from "@calcom/types/CrmService";

import type { ParseRefreshTokenResponse } from "../../_utils/oauth/parseRefreshTokenResponse";
import parseRefreshTokenResponse from "../../_utils/oauth/parseRefreshTokenResponse";
import { default as appMeta } from "../config.json";
import {
  SalesforceRecordEnum,
  SalesforceFieldType,
  WhenToWriteToRecord,
  DateFieldTypeData,
  RoutingReasons,
} from "./enums";
import { getSalesforceAppKeys } from "./getSalesforceAppKeys";

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

type Attendee = { email: string; name: string };

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
  private fallbackToContact = false;

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
    const { consumer_key, consumer_secret } = await getSalesforceAppKeys();
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
    const query = await conn.query(`SELECT Id, Email FROM User WHERE Email = '${email}' AND IsActive = true`);
    if (query.records.length > 0) {
      return (query.records[0] as { Email: string; Id: string }).Id;
    }
  };

  private getSalesforceUserFromUserId = async (userId: string) => {
    const conn = await this.conn;

    return await conn.query(`SELECT Id, Email, Name FROM User WHERE Id = '${userId}' AND IsActive = true`);
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
      confirmedCustomFieldInputs[field.name] = appOptions.onBookingWriteToEventObjectMap[field.name];
    }

    const ownerId = await this.getSalesforceUserIdFromEmail(event.organizer.email);
    /**
     * Current code assume that contacts is not empty.
     * I'm not going to reject the promise since I don't know if this is a valid assumption.
     **/
    const [firstContact] = contacts;

    const createdEvent = await this.salesforceCreateEventApiCall(event, {
      EventWhoIds: contacts.map((contact) => contact.id),
      ...confirmedCustomFieldInputs,
      ...(ownerId && { OwnerId: ownerId }),
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
          WhoId: firstContact,
        }).catch((reason) => Promise.reject(reason));
      }
      return Promise.reject(reason);
    });
    // Check to see if we also need to change the record owner
    if (appOptions.onBookingChangeRecordOwner && appOptions.onBookingChangeRecordOwnerName && ownerId) {
      // TODO: firstContact id is assumed to not be undefined. But current code doesn't check for it.
      await this.checkRecordOwnerNameFromRecordId(firstContact.id, ownerId);
    }
    if (appOptions.onBookingWriteToRecord && appOptions.onBookingWriteToRecordFields) {
      await this.writeToPersonRecord(
        // TODO: firstContact id is assumed to not be undefined. But current code doesn't check for it.
        firstContact.id,
        event.startTime,
        event.organizer.email,
        event.responses,
        event?.uid
      );
    }
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
      this.log.info("event:creation:ok", { sfEvent });
      return {
        uid: sfEvent.id,
        id: sfEvent.id,
        type: "salesforce_other_calendar",
        password: "",
        url: "",
        additionalInfo: { contacts, sfEvent, calWarnings: this.calWarnings },
      };
    }
    this.log.info("event:creation:notOk", { event, sfEvent, contacts });
    return Promise.reject({
      calError: "Something went wrong when creating an event in Salesforce",
    });
  }

  async createEvent(event: CalendarEvent, contacts: Contact[]): Promise<CrmEvent | undefined> {
    const skipEventCreation = this.getDoNotCreateEvent();
    if (skipEventCreation) return undefined;

    const sfEvent = await this.salesforceCreateEvent(event, contacts);
    if (sfEvent.success) {
      return {
        uid: sfEvent.id,
        id: sfEvent.id,
        type: "salesforce_other_calendar",
        password: "",
        url: "",
        additionalInfo: { contacts, sfEvent, calWarnings: this.calWarnings },
      };
    }
    this.log.debug("event:creation:notOk", { event, sfEvent, contacts });
    return Promise.reject("Something went wrong when creating an event in Salesforce");
  }

  async updateEvent(uid: string, event: CalendarEvent): Promise<CrmEvent> {
    const updatedEvent = await this.salesforceUpdateEvent(uid, event);
    if (updatedEvent.success) {
      return {
        uid: updatedEvent.id,
        id: updatedEvent.id,
        type: "salesforce_other_calendar",
        password: "",
        url: "",
        additionalInfo: { calWarnings: this.calWarnings },
      };
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
    let accountOwnerId = "";
    if (recordToSearch === SalesforceRecordEnum.ACCOUNT) {
      // For an account let's assume that the first email is the one we should be querying against
      const attendeeEmail = emailArray[0];
      soql = `SELECT Id, Email, OwnerId, AccountId FROM Contact WHERE Email = '${attendeeEmail}' AND AccountId != null`;

      // If this is for a round robin skip then we need to return the account record
      if (forRoundRobinSkip) {
        const results = await conn.query(soql);
        if (results.records.length) {
          const contact = results.records[0] as { AccountId: string };
          if (contact) {
            soql = `SELECT Id, OwnerId FROM Account WHERE Id = '${contact.AccountId}'`;
          }
        } else {
          // If we can't find the exact contact, then we need to search for an account where the contacts share the same email domain
          const accountId = await this.getAccountIdBasedOnEmailDomainOfContacts(attendeeEmail);
          if (accountId) {
            soql = `SELECT Id, OwnerId FROM Account WHERE Id = '${accountId}'`;
          }
        }
      }
      // If creating events on contacts or leads
    } else {
      soql = `SELECT Id, Email, OwnerId FROM ${recordToSearch} WHERE Email IN ('${emailArray.join("','")}')`;
    }
    const results = await conn.query(soql);

    // If we're checking against the contact, the ownerId should take precedence
    if (recordToSearch === SalesforceRecordEnum.ACCOUNT && results.records.length) {
      const account = results.records[0] as ContactRecord;
      accountOwnerId = account.OwnerId;
    }

    let records: ContactRecord[] = [];

    // If falling back to contacts, check for the contact before returning the leads or empty array
    if (
      appOptions.createEventOn === SalesforceRecordEnum.LEAD &&
      appOptions.createEventOnLeadCheckForContact
    ) {
      // Get any matching contacts
      const contactSearch = await conn.query(
        `SELECT Id, Email, OwnerId FROM ${SalesforceRecordEnum.CONTACT} WHERE Email IN ('${emailArray.join(
          "','"
        )}')`
      );

      if (contactSearch && contactSearch.records.length > 0) {
        records = contactSearch.records as ContactRecord[];
        this.setFallbackToContact(true);
      }
    } else if (!results || !results.records.length) {
      return [];
    }

    if (!records.length) records = results.records as ContactRecord[];

    if (includeOwner || forRoundRobinSkip) {
      const ownerIds: Set<string> = new Set();
      if (accountOwnerId) {
        ownerIds.add(accountOwnerId);
      } else {
        records.forEach((record) => {
          ownerIds.add(record.OwnerId);
        });
      }

      const ownersQuery = (await Promise.all(
        Array.from(ownerIds).map(async (ownerId) => {
          return await this.getSalesforceUserFromUserId(ownerId);
        })
      )) as { records: ContactRecord[] }[];
      const contactsWithOwners = records.map((record) => {
        const ownerEmail = accountOwnerId
          ? ownersQuery[0].records[0].Email
          : ownersQuery.find((user) => user.records[0]?.Id === record.OwnerId)?.records[0].Email;
        return {
          id: record.Id,
          email: record.Email,
          ownerId: record.OwnerId,
          ownerEmail,
          recordType: accountOwnerId ? SalesforceRecordEnum.ACCOUNT : record.attributes.type,
        };
      });
      return contactsWithOwners;
    }

    return records
      ? records.map((record) => ({
          id: record.Id,
          email: record.Email,
          recordType: record.attributes.type,
        }))
      : [];
  }

  async createContacts(
    contactsToCreate: Attendee[],
    organizerEmail?: string,
    calEventResponses?: CalEventResponses | null
  ) {
    const conn = await this.conn;
    const appOptions = this.getAppOptions();
    const createEventOn = appOptions.createEventOn ?? SalesforceRecordEnum.CONTACT;
    // See if the organizer exists in the CRM
    const organizerId = organizerEmail ? await this.getSalesforceUserIdFromEmail(organizerEmail) : undefined;
    const createdContacts: { id: string; email: string }[] = [];

    if (createEventOn === SalesforceRecordEnum.CONTACT) {
      await Promise.all(
        contactsToCreate.map(async (attendee) => {
          return await this.createAttendeeRecord({
            attendee,
            recordType: SalesforceRecordEnum.CONTACT,
            organizerId,
          }).then((result) => {
            createdContacts.push(...result);
          });
        })
      );
    }

    if (createEventOn === SalesforceRecordEnum.LEAD) {
      // Base this off of the first contact
      const attendee = contactsToCreate[0];

      if (appOptions.createNewContactUnderAccount) {
        // Check for an account
        const accountId = await this.getAccountIdBasedOnEmailDomainOfContacts(attendee.email);

        if (accountId) {
          const createdAccountContacts = await this.createNewContactUnderAnAccount({
            attendee,
            accountId,
            organizerId,
          });

          if (createdContacts.length > 0) {
            createdContacts.push(...createdAccountContacts);
          }
        }
      } else {
        await this.createAttendeeRecord({
          attendee,
          recordType: SalesforceRecordEnum.LEAD,
          organizerId,
          calEventResponses,
        }).then((result) => {
          createdContacts.push(...result);
        });
      }
    }

    if (createEventOn === SalesforceRecordEnum.ACCOUNT) {
      if (!appOptions.createNewContactUnderAccount && !appOptions.createLeadIfAccountNull) {
        this.setDoNotCreateEvent(true);
        return [{ id: "Do not create event", email: "placeholder" }];
      }

      // Base this off of the first contact
      const attendee = contactsToCreate[0];

      const accountId = await this.getAccountIdBasedOnEmailDomainOfContacts(attendee.email);

      let contactCreated = false;

      if (accountId && appOptions.createNewContactUnderAccount) {
        const createdAccountContacts = await this.createNewContactUnderAnAccount({
          attendee,
          accountId,
          organizerId,
        });

        if (createdContacts.length > 0) {
          createdContacts.push(...createdAccountContacts);
          contactCreated = true;
        }
      }

      if (!accountId && appOptions.createLeadIfAccountNull && !contactCreated) {
        // Check to see if the lead exists already
        const leadQuery = await conn.query(`SELECT Id, Email FROM Lead WHERE Email = '${attendee.email}'`);
        if (leadQuery.records.length) {
          const contact = leadQuery.records[0] as { Id: string; Email: string };
          return [{ id: contact.Id, email: contact.Email }];
        }

        for (const attendee of contactsToCreate) {
          try {
            const createBody = await this.generateCreateRecordBody({
              attendee,
              recordType: SalesforceRecordEnum.LEAD,
              organizerId,
              calEventResponses,
            });

            const result = await conn.sobject(SalesforceRecordEnum.LEAD).create(createBody);
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

  async handleAttendeeNoShow(bookingUid: string, attendees: { email: string; noShow: boolean }[]) {
    const appOptions = this.getAppOptions();
    const { sendNoShowAttendeeData = false, sendNoShowAttendeeDataField = {} } = appOptions;
    const conn = await this.conn;
    // Check that no show is enabled
    if (!sendNoShowAttendeeData && !sendNoShowAttendeeDataField) {
      this.log.warn(`No show settings not set for bookingUid ${bookingUid}`);
      return;
    }
    // Get all Salesforce events associated with the booking
    const salesforceEvents = await prisma.bookingReference.findMany({
      where: {
        type: appMeta.type,
        booking: {
          uid: bookingUid,
        },
      },
    });

    const salesforceEntity = await conn.describe("Event");
    const fields = salesforceEntity.fields;
    const noShowField = fields.find((field) => field.name === sendNoShowAttendeeDataField);

    if (!noShowField || (noShowField.type as unknown as string) !== "boolean") {
      this.log.warn(
        `No show field on Salesforce doesn't exist or is not of type boolean for bookingUid ${bookingUid}`
      );
      return;
    }

    for (const event of salesforceEvents) {
      const salesforceEvent = (await conn.query(`SELECT WhoId FROM Event WHERE Id = '${event.uid}'`)) as {
        records: { WhoId: string }[];
      };

      let salesforceAttendeeEmail: string | undefined = undefined;
      // Figure out if the attendee is a contact or lead
      const contactQuery = (await conn.query(
        `SELECT Email FROM Contact WHERE Id = '${salesforceEvent.records[0].WhoId}'`
      )) as { records: { Email: string }[] };
      const leadQuery = (await conn.query(
        `SELECT Email FROM Lead WHERE Id = '${salesforceEvent.records[0].WhoId}'`
      )) as { records: { Email: string }[] };

      // Prioritize contacts over leads
      if (contactQuery.records.length > 0) {
        salesforceAttendeeEmail = contactQuery.records[0].Email;
      } else if (leadQuery.records.length > 0) {
        salesforceAttendeeEmail = leadQuery.records[0].Email;
      } else {
        this.log.warn(
          `Could not find attendee for bookingUid ${bookingUid} and salesforce event id ${event.uid}`
        );
      }

      if (salesforceAttendeeEmail) {
        // Find the attendee no show data
        const noShowData = attendees.find((attendee) => attendee.email === salesforceAttendeeEmail);

        if (!noShowData) {
          this.log.warn(
            `No show data could not be found for ${salesforceAttendeeEmail} and bookingUid ${bookingUid}`
          );
        } else {
          // Update the event with the no show data
          await conn.sobject("Event").update({
            Id: event.uid,
            [sendNoShowAttendeeDataField]: noShowData.noShow,
          });
        }
      }
    }
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

  private async createAttendeeRecord({
    attendee,
    recordType,
    organizerId,
    accountId,
    calEventResponses,
  }: {
    attendee: Attendee;
    recordType: SalesforceRecordEnum;
    organizerId?: string;
    accountId?: string;
    calEventResponses?: CalEventResponses | null;
  }) {
    const conn = await this.conn;

    const createBody = await this.generateCreateRecordBody({
      attendee,
      recordType: recordType,
      organizerId,
      calEventResponses,
    });

    return await conn
      .sobject(recordType)
      .create({
        ...createBody,
        AccountId: accountId,
      })
      .then((result) => {
        if (result.success) {
          return [{ id: result.id, email: attendee.email }];
        } else {
          return [];
        }
      })
      .catch((error) => {
        this.log.error(`Error creating Salesforce contact for ${attendee.email} with error ${error}`);
        return [];
      });
  }

  private async generateCreateRecordBody({
    attendee,
    recordType,
    organizerId,
    calEventResponses,
  }: {
    attendee: { email: string; name: string };
    recordType: SalesforceRecordEnum;
    organizerId?: string;
    /**Only Leads have the default company field */
    calEventResponses?: CalEventResponses | null;
  }) {
    const [FirstName, LastName] = attendee.name ? attendee.name.split(" ") : [attendee.email, ""];

    // Assume that the first part of the email domain is the company title
    const company =
      (await this.getCompanyNameFromBookingResponse(calEventResponses)) ??
      attendee.email.split("@")[1].split(".")[0];
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
    const foundFields: jsforce.Field[] = [];

    try {
      const salesforceEntity = await conn.describe(sobject);
      const fields = salesforceEntity.fields;

      for (const field of fields) {
        if (foundFields.length === fieldSet.size) break;

        if (fieldSet.has(field.name)) {
          foundFields.push(field);
        }
      }

      return foundFields;
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  private async checkRecordOwnerNameFromRecordId(id: string, newOwnerId: string) {
    const conn = await this.conn;
    const appOptions = this.getAppOptions();

    if (!appOptions?.createEventOn) {
      this.log.warn(
        `No appOptions.createEventOn found for ${this.integrationName} on checkRecordOwnerNameFromRecordId`
      );
      return;
    }

    // Get the associated record that the event was created on
    const recordQuery = (await conn.query(
      `SELECT OwnerId FROM ${appOptions.createEventOn} WHERE Id = '${id}'`
    )) as { records: { OwnerId: string }[] };

    if (!recordQuery || !recordQuery.records.length) return;

    const ownerId = recordQuery.records[0].OwnerId;

    const ownerQuery = await this.getSalesforceUserFromUserId(ownerId);

    if (!ownerQuery || !ownerQuery.records.length) return;

    const owner = ownerQuery.records[0] as { Name: string };

    // Check that the owner name matches the names where we need to change the organizer
    if (appOptions?.onBookingChangeRecordOwnerName.includes(owner.Name)) {
      await conn.sobject(appOptions?.createEventOn).update({
        // First field is there WHERE statement
        Id: id,
        OwnerId: newOwnerId,
      });
    }
  }

  private async getAccountIdBasedOnEmailDomainOfContacts(email: string) {
    const conn = await this.conn;
    const emailDomain = email.split("@")[1];

    // First check if an account has the same website as the email domain of the attendee
    const accountQuery = await conn.query(
      `SELECT Id, Website FROM Account WHERE Website LIKE '%${emailDomain}%'`
    );

    if (accountQuery.records.length > 0) {
      const account = accountQuery.records[0] as { Id: string };
      return account.Id;
    }

    // Fallback to querying which account the majority of contacts are under
    const response = await conn.query(
      `SELECT Id, Email, AccountId FROM Contact WHERE Email LIKE '%@${emailDomain}' AND AccountId != null`
    );

    return this.getDominantAccountId(response.records as { AccountId: string }[]);
  }

  private setFallbackToContact(boolean: boolean) {
    this.fallbackToContact = boolean;
  }

  private getFallbackToContact() {
    return this.fallbackToContact;
  }

  private async writeToPersonRecord(
    contactId: string,
    startTime: string,
    organizerEmail: string,
    calEventResponses?: CalEventResponses | null,
    bookingUid?: string | null
  ) {
    const conn = await this.conn;
    const { createEventOn, onBookingWriteToRecordFields = {} } = this.getAppOptions();

    // Determine record type (Contact or Lead)
    const personRecordType = this.determinePersonRecordType(createEventOn);

    // Search the fields and ensure 1. they exist 2. they're the right type
    const fieldsToWriteOn = Object.keys(onBookingWriteToRecordFields);
    const existingFields = await this.ensureFieldsExistOnObject(fieldsToWriteOn, personRecordType);

    const personRecord = await this.fetchPersonRecord(contactId, existingFields, personRecordType);
    if (!personRecord) {
      this.log.warn(`No personRecord found for contactId ${contactId}`);
      return;
    }

    const writeOnRecordBody = await this.buildRecordUpdatePayload({
      existingFields,
      personRecord,
      onBookingWriteToRecordFields,
      startTime,
      bookingUid,
      organizerEmail,
      calEventResponses,
    });

    // Update the person record
    await conn
      .sobject(personRecordType)
      .update({
        Id: contactId,
        ...writeOnRecordBody,
      })
      .catch((e) => {
        this.log.error(`Error updating person record for contactId ${contactId}`, e);
      });
  }

  private async buildRecordUpdatePayload({
    existingFields,
    personRecord,
    onBookingWriteToRecordFields,
    startTime,
    bookingUid,
    organizerEmail,
    calEventResponses,
  }: {
    existingFields: jsforce.Field[];
    personRecord: Record<string, any>;
    onBookingWriteToRecordFields: Record<string, any>;
    startTime: string;
    bookingUid?: string | null;
    organizerEmail: string;
    calEventResponses?: CalEventResponses | null;
  }): Promise<Record<string, any>> {
    const writeOnRecordBody: Record<string, any> = {};

    for (const field of existingFields) {
      const fieldConfig = onBookingWriteToRecordFields[field.name];

      // Skip if field should only be written when empty and already has a value
      if (fieldConfig.whenToWrite === WhenToWriteToRecord.FIELD_EMPTY && personRecord[field.name]) {
        continue;
      }

      // Handle different field types
      if (fieldConfig.fieldType === field.type) {
        if (field.type === SalesforceFieldType.TEXT || field.type === SalesforceFieldType.PHONE) {
          const extractedText = await this.getTextFieldValue({
            fieldValue: fieldConfig.value,
            fieldLength: field.length,
            calEventResponses,
            bookingUid,
          });
          if (extractedText) {
            writeOnRecordBody[field.name] = extractedText;
          }
        } else if (field.type === SalesforceFieldType.DATE) {
          const dateValue = await this.getDateFieldValue(
            fieldConfig.value,
            startTime,
            bookingUid,
            organizerEmail
          );
          if (dateValue) {
            writeOnRecordBody[field.name] = dateValue;
          }
        }
      }
    }

    return writeOnRecordBody;
  }
  private async getTextFieldValue({
    fieldValue,
    fieldLength,
    calEventResponses,
    bookingUid,
  }: {
    fieldValue: string;
    fieldLength: number;
    calEventResponses?: CalEventResponses | null;
    bookingUid?: string | null;
  }) {
    // If no {} then indicates we're passing a static value
    if (!fieldValue.startsWith("{") && !fieldValue.endsWith("}")) return fieldValue;

    let valueToWrite = fieldValue;

    if (fieldValue.startsWith("{form:")) {
      // Get routing from response
      if (!bookingUid) return;
      valueToWrite = await this.getTextValueFromRoutingFormResponse(fieldValue, bookingUid);
    } else {
      // Get the value from the booking response
      if (!calEventResponses) return;
      valueToWrite = this.getTextValueFromBookingResponse(fieldValue, calEventResponses);
    }

    // If a value wasn't found in the responses. Don't return the field name
    if (valueToWrite === fieldValue) return;

    // Trim incase the replacement values increased the length
    return valueToWrite.substring(0, fieldLength);
  }

  private async getTextValueFromRoutingFormResponse(fieldValue: string, bookingUid: string) {
    // Get the form response
    const routingFormResponse = await prisma.app_RoutingForms_FormResponse.findFirst({
      where: {
        routedToBookingUid: bookingUid,
      },
      select: {
        response: true,
      },
    });
    if (!routingFormResponse) return fieldValue;
    const response = routingFormResponse.response as FormResponse;
    const regex = /\{form:(.*?)\}/;
    const regexMatch = fieldValue.match(regex);
    if (!regexMatch) return fieldValue;

    const identifierField = regexMatch?.[1];
    if (!identifierField) return fieldValue;

    // Search for fieldValue, only handle raw text return for now
    for (const fieldId of Object.keys(response)) {
      const field = response[fieldId];

      if (field?.identifier === identifierField) {
        return field.value.toString();
      }
    }

    return fieldValue;
  }

  private getTextValueFromBookingResponse(fieldValue: string, calEventResponses: CalEventResponses) {
    const regexValueToReplace = /\{(.*?)\}/g;
    return fieldValue.replace(regexValueToReplace, (match, captured) => {
      return calEventResponses[captured]?.value ? calEventResponses[captured].value.toString() : match;
    });
  }

  private async getDateFieldValue(
    fieldValue: string,
    startTime: string,
    bookingUid?: string | null,
    organizerEmail?: string
  ): Promise<string | null> {
    if (fieldValue === DateFieldTypeData.BOOKING_START_DATE) {
      return new Date(startTime).toISOString();
    }
    if (fieldValue === DateFieldTypeData.BOOKING_CREATED_DATE && bookingUid) {
      const booking = await prisma.booking.findFirst({
        where: { uid: bookingUid },
        select: { createdAt: true },
      });

      if (!booking) {
        this.log.warn(`No booking found for ${bookingUid}`);
        return null;
      }

      return new Date(booking.createdAt).toISOString();
    }

    if (!bookingUid) {
      this.log.warn(`No uid for booking with organizer ${organizerEmail}`);
    }

    return null;
  }

  private determinePersonRecordType(createEventOn: string): SalesforceRecordEnum {
    return createEventOn === SalesforceRecordEnum.LEAD &&
      this.appOptions.createEventOnLeadCheckForContact &&
      this.getFallbackToContact()
      ? SalesforceRecordEnum.CONTACT
      : this.appOptions.createEventOn;
  }

  private async fetchPersonRecord(
    contactId: string,
    existingFields: jsforce.Field[],
    personRecordType: SalesforceRecordEnum
  ): Promise<Record<string, any> | null> {
    const conn = await this.conn;
    const existingFieldNames = existingFields.map((field) => field.name);

    const query = await conn.query(
      `SELECT ${existingFieldNames.join(", ")} FROM ${personRecordType} WHERE Id = '${contactId}'`
    );

    if (!query.records.length) {
      this.log.warn(`Could not find person record with id ${contactId}`);
      return null;
    }

    return query.records[0] as Record<string, any>;
  }

  private async createNewContactUnderAnAccount({
    attendee,
    accountId,
    organizerId,
  }: {
    attendee: Attendee;
    accountId: string;
    organizerId?: string;
  }) {
    const conn = await this.conn;

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

    return await this.createAttendeeRecord({
      attendee,
      recordType: SalesforceRecordEnum.CONTACT,
      accountId,
      organizerId,
    });
  }

  async findUserEmailFromLookupField(
    attendeeEmail: string,
    fieldName: string,
    salesforceObject: SalesforceRecordEnum
  ) {
    const conn = await this.conn;

    // Ensure the field exists on the record
    const existingFields = await this.ensureFieldsExistOnObject([fieldName], salesforceObject);

    if (!existingFields.length) return;

    const lookupField = existingFields[0];

    if (salesforceObject === SalesforceRecordEnum.ACCOUNT) {
      const accountId = await this.getAccountIdBasedOnEmailDomainOfContacts(attendeeEmail);

      if (!accountId) return;

      const accountQuery = (await conn.query(
        `SELECT ${lookupField.name} FROM ${SalesforceRecordEnum.ACCOUNT} WHERE Id = '${accountId}'`
      )) as {
        records: { [key: string]: any };
      };

      if (!accountQuery.records.length) return;

      const lookupFieldUserId = accountQuery.records[0][lookupField.name];

      if (!lookupFieldUserId) return;

      const userQuery = await this.getSalesforceUserFromUserId(lookupFieldUserId);

      if (!userQuery.records.length) return;

      const user = userQuery.records[0] as { Email: string };

      return { email: user.Email, recordType: RoutingReasons.ACCOUNT_LOOKUP_FIELD };
    }
  }

  /** Search the booking questions for the Company field value rather than relying on the email domain  */
  private async getCompanyNameFromBookingResponse(calEventResponses?: CalEventResponses | null) {
    const appOptions = this.getAppOptions();
    const companyFieldName = "Company";
    const defaultTextValueLength = 225;

    const { onBookingWriteToRecordFields = undefined } = appOptions;

    if (!onBookingWriteToRecordFields || !calEventResponses) return;

    // Check that we're writing to the Company field
    if (!(companyFieldName in onBookingWriteToRecordFields)) return;

    const companyValue = await this.getTextFieldValue({
      fieldValue: onBookingWriteToRecordFields[companyFieldName].value,
      fieldLength: defaultTextValueLength,
      calEventResponses,
    });

    if (companyValue === onBookingWriteToRecordFields[companyFieldName]) return;
    return companyValue;
  }
}
