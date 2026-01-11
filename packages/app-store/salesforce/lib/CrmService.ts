import type { TokenResponse, Connection, Field } from "@jsforce/jsforce-node";
import jsforce from "@jsforce/jsforce-node";
import { RRule } from "rrule";
import { z } from "zod";

import { RoutingFormResponseDataFactory } from "@calcom/app-store/routing-forms/lib/RoutingFormResponseDataFactory";
import { checkIfFreeEmailDomain } from "@calcom/features/watchlist/lib/freeEmailDomainCheck/checkIfFreeEmailDomain";
import { getLocation } from "@calcom/lib/CalEventParser";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { RetryableError } from "@calcom/lib/crmManager/errors";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { PrismaAssignmentReasonRepository } from "@calcom/lib/server/repository/PrismaAssignmentReasonRepository";
import { PrismaRoutingFormResponseRepository as RoutingFormResponseRepository } from "@calcom/lib/server/repository/PrismaRoutingFormResponseRepository";
import { prisma } from "@calcom/prisma";
import type { CalendarEvent, CalEventResponses } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { CRM, Contact, CrmEvent } from "@calcom/types/CrmService";

import type { ParseRefreshTokenResponse } from "../../_utils/oauth/parseRefreshTokenResponse";
import parseRefreshTokenResponse from "../../_utils/oauth/parseRefreshTokenResponse";
import { findFieldValueByIdentifier } from "../../routing-forms/lib/findFieldValueByIdentifier";
import { default as appMeta } from "../config.json";
import type { writeToRecordDataSchema, appDataSchema, writeToBookingEntry } from "../zod";
import {
  SalesforceRecordEnum,
  SalesforceFieldType,
  WhenToWriteToRecord,
  DateFieldTypeData,
  RoutingReasons,
} from "./enums";
import { getSalesforceAppKeys } from "./getSalesforceAppKeys";
import { SalesforceGraphQLClient } from "./graphql/SalesforceGraphQLClient";
import getAllPossibleWebsiteValuesFromEmailDomain from "./utils/getAllPossibleWebsiteValuesFromEmailDomain";
import getDominantAccountId from "./utils/getDominantAccountId";
import type { GetDominantAccountIdInput } from "./utils/getDominantAccountId";

class SFObjectToUpdateNotFoundError extends RetryableError {
  constructor(message: string) {
    super(message);
  }
}

type ExtendedTokenResponse = TokenResponse & {
  instance_url: string;
};

const sfApiErrors = {
  INVALID_EVENTWHOIDS: "INVALID_FIELD: No such column 'EventWhoIds' on sobject of type Event",
};

type ContactRecord = {
  Id?: string;
  Email?: string;
  OwnerId?: string;
  AccountId?: string;
  attributes?: {
    type?: string;
  };
  Account?: {
    Owner?: {
      Email?: string;
    };
    Website?: string;
  };
  Owner?: {
    Email?: string;
    Name?: string;
  };
};

type SalesforceDuplicateError = {
  name?: string;
  duplicateResult?: {
    matchResults?: Array<{
      matchRecords?: Array<{
        record: { Id: string };
      }>;
    }>;
  };
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
  private conn!: Promise<Connection>;
  private log: typeof logger;
  private calWarnings: string[] = [];
  private appOptions: z.infer<typeof appDataSchema>;
  private doNotCreateEvent = false;
  private fallbackToContact = false;
  private accessToken: string;
  private instanceUrl: string;

  constructor(credential: CredentialPayload, appOptions: z.infer<typeof appDataSchema>, testMode = false) {
    this.integrationName = "salesforce_other_calendar";
    if (!testMode) {
      this.conn = this.getClient(credential).then((c) => c);
    }
    this.log = logger.getSubLogger({ prefix: [`[[lib] ${this.integrationName}`] });
    this.appOptions = appOptions;
    const credentialKey = credential.key as unknown as ExtendedTokenResponse;
    this.accessToken = credentialKey.access_token;
    this.instanceUrl = credentialKey.instance_url;
  }

  public getAppOptions() {
    return this.appOptions;
  }

  private getClient = async (credential: CredentialPayload) => {
    const { consumer_key, consumer_secret } = await getSalesforceAppKeys();
    const credentialKey = credential.key as unknown as ExtendedTokenResponse;

    if (!credentialKey.refresh_token)
      throw new Error(`Refresh token is missing for credential ${credential.id}`);

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
      oauth2: {
        clientId: consumer_key,
        clientSecret: consumer_secret,
        redirectUri: `${WEBAPP_URL}/api/integrations/salesforce/callback`,
      },
      instanceUrl: credentialKey.instance_url,
      accessToken: credentialKey.access_token,
      refreshToken: credentialKey.refresh_token,
    });
  };

  private getSalesforceUserIdFromEmail = async (email: string) => {
    const conn = await this.conn;
    const query = await conn.query(
      `SELECT Id, Email FROM User WHERE Email = '${email}' AND IsActive = true LIMIT 1`
    );
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
    const log = logger.getSubLogger({ prefix: [`[salesforceCreateEvent]:${event.uid}`] });

    const appOptions = this.getAppOptions();

    const writeToEventRecord = await this.generateWriteToEventBody(event);
    log.info(`Writing to event fields: ${Object.keys(writeToEventRecord)} `);

    let ownerId: string | undefined = undefined;
    if (event?.organizer?.email) {
      ownerId = await this.getSalesforceUserIdFromEmail(event.organizer.email);
    } else {
      log.warn("No organizer email found for event", event?.organizer);
    }
    log.info(`Organizer found with Salesforce id ${ownerId}`);

    /**
     * Current code assume that contacts is not empty.
     **/
    const [firstContact] = contacts;

    if (!firstContact?.id) {
      log.error("No contacts found for event", { contacts });
      throw new SFObjectToUpdateNotFoundError("No contacts found for event");
    }

    const eventWhoIds = contacts.reduce((contactIds, contact) => {
      if (contact?.id) {
        contactIds.push(contact.id);
      }

      return contactIds;
    }, [] as string[]);

    if (eventWhoIds.length !== contacts.length) {
      log.warn(`Not all contacts contain ids ${contacts}`);
    }

    const createdEvent = await this.salesforceCreateEventApiCall(event, {
      EventWhoIds: eventWhoIds,
      ...writeToEventRecord,
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
          WhoId: firstContact.id,
        }).catch((reason) => Promise.reject(reason));
      }
      log.error(`Error creating event: ${JSON.stringify(reason)}`);

      // Try creating a simple object without additional records
      return await this.salesforceCreateEventApiCall(event, {
        WhoId: firstContact.id,
        ...(ownerId && { OwnerId: ownerId }),
      }).catch((reason) => {
        log.error(`Error creating simple event: ${JSON.stringify(reason)}`);
        return Promise.reject(reason);
      });
    });
    // Check to see if we also need to change the record owner
    if (appOptions?.onBookingChangeRecordOwner && appOptions?.onBookingChangeRecordOwnerName) {
      if (ownerId) {
        // TODO: firstContact id is assumed to not be undefined. But current code doesn't check for it.
        await this.checkRecordOwnerNameFromRecordId(firstContact.id, ownerId);
      } else {
        log.warn(
          `Could not find owner with email ${event.organizer.email} to change record ${firstContact.id} ownership to`
        );
      }
    }
    if (appOptions?.onBookingWriteToRecord && appOptions?.onBookingWriteToRecordFields) {
      await this.writeToRecord({
        // TODO: firstContact id is assumed to not be undefined. But current code doesn't check for it.
        recordId: firstContact.id,
        fieldsToWriteTo: appOptions.onBookingWriteToRecordFields,
        startTime: event.startTime,
        organizerEmail: event.organizer?.email,
        calEventResponses: event.responses,
        bookingUid: event?.uid,
      });
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

  private salesforceDeleteEvent = async (uid: string, event: CalendarEvent) => {
    const appOptions = this.getAppOptions();
    const conn = await this.conn;

    if (appOptions?.onCancelWriteToEventRecord) {
      const fieldsToWriteTo = appOptions?.onCancelWriteToEventRecordFields;

      // If the option is enabled then don't delete the event record
      if (!fieldsToWriteTo || !Object.keys(fieldsToWriteTo)) {
        return Promise.resolve();
      }

      return await this.writeToRecord({
        recordId: uid,
        fieldsToWriteTo,
        startTime: event.startTime,
        organizerEmail: event.organizer?.email,
        calEventResponses: event.responses,
        bookingUid: event?.uid,
      });
    }
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

  public async deleteEvent(uid: string, event: CalendarEvent) {
    await this.salesforceDeleteEvent(uid, event)
      .then(() => {
        return Promise.resolve();
      })
      .catch((error) => {
        this.log.error(`Error canceling event ${uid} with error ${error}`);
        return Promise.reject({ calError: "Something went wrong when deleting the event in Salesforce" });
      });
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
    const log = logger.getSubLogger({ prefix: [`[getContacts]:${emails}`] });

    try {
      const conn = await this.conn;
      const emailArray = Array.isArray(emails) ? emails : [emails];

      const appOptions = this.getAppOptions();
      const recordToSearch =
        (forRoundRobinSkip ? appOptions?.roundRobinSkipCheckRecordOn : appOptions?.createEventOn) ??
        SalesforceRecordEnum.CONTACT;

      let soql: string;

      log.info(
        "Getting contacts for emails",
        safeStringify({
          emailArray,
          includeOwner,
          forRoundRobinSkip,
          recordToSearch,
          appOptions,
        })
      );

      if (recordToSearch === SalesforceRecordEnum.ACCOUNT && forRoundRobinSkip) {
        try {
          const client = new SalesforceGraphQLClient({
            accessToken: this.accessToken,
            instanceUrl: this.instanceUrl,
          });
          return await client.GetAccountRecordsForRRSkip(emailArray[0]);
        } catch (error) {
          log.error("Error getting account records for round robin skip", safeStringify({ error }));
          return [];
        }
      }

      let records: ContactRecord[] = [];

      // This combination is for searching for ownership via contacts
      if (
        recordToSearch === SalesforceRecordEnum.CONTACT &&
        appOptions?.roundRobinSkipFallbackToLeadOwner &&
        forRoundRobinSkip
      ) {
        const record = await this.getContactOrLeadFromEmail({ email: emailArray[0], conn });
        if (record) {
          records.push(record);
        }
      }

      // If falling back to contacts, check for the contact before returning the leads or empty array
      if (
        appOptions.createEventOn === SalesforceRecordEnum.LEAD &&
        appOptions.createEventOnLeadCheckForContact &&
        !forRoundRobinSkip
      ) {
        const record = await this.getContactOrLeadFromEmail({
          email: emailArray[0],
          setFallbackToContact: true,
          conn,
        });
        if (record) {
          records.push(record);
        }
      }

      if (records.length === 0) {
        // Handle Account record type
        if (recordToSearch === SalesforceRecordEnum.ACCOUNT) {
          // For an account let's assume that the first email is the one we should be querying against
          const attendeeEmail = emailArray[0];
          log.info("[recordToSearch=ACCOUNT] Searching contact for email", safeStringify({ attendeeEmail }));
          soql = `SELECT Id, Email, OwnerId, AccountId, Account.OwnerId, Account.Owner.Email, Account.Website FROM ${SalesforceRecordEnum.CONTACT} WHERE Email = '${attendeeEmail}' AND AccountId != null`;
        } else {
          // Handle Contact/Lead record types
          soql = `SELECT Id, Email, OwnerId, Owner.Email FROM ${recordToSearch} WHERE Email IN ('${emailArray.join(
            "','"
          )}')`;
        }

        const results = await conn.query(soql);

        log.info("Query results", safeStringify({ recordCount: results.records?.length }));

        if (results.records.length === 0) {
          log.info("No records found");
          return [];
        }

        if (!records.length && results?.records?.length) {
          records = results.records as ContactRecord[];
        }
      }

      const includeOwnerData =
        (includeOwner || forRoundRobinSkip) &&
        !(await this.shouldSkipAttendeeIfFreeEmailDomain(emailArray[0]));

      const includeAccountRecordType = forRoundRobinSkip && recordToSearch === SalesforceRecordEnum.ACCOUNT;
      return records.map((record) => {
        // Handle if Account is nested
        const ownerEmail =
          recordToSearch === SalesforceRecordEnum.ACCOUNT &&
          record?.attributes?.type !== SalesforceRecordEnum.ACCOUNT
            ? record?.Account?.Owner?.Email
            : record?.Owner?.Email;

        return {
          id: includeAccountRecordType ? record?.AccountId || "" : record?.Id || "",
          email: record?.Email || "",
          recordType: includeAccountRecordType ? SalesforceRecordEnum.ACCOUNT : record?.attributes?.type,
          ...(includeOwnerData && {
            ownerId: record?.OwnerId,
            ownerEmail: ownerEmail,
          }),
        };
      });
    } catch (error) {
      log.error("Error in getContacts", safeStringify(error));
      return [];
    }
  }

  private async getContactOrLeadFromEmail({
    email,
    setFallbackToContact = false,
    conn,
  }: {
    email: string;
    setFallbackToContact?: boolean;
    conn: Connection;
  }) {
    // Escape SOSL reserved characters: ? & | ! { } [ ] ( ) ^ ~ * : \ " ' + -
    // eslint-disable-next-line no-useless-escape
    const escapedEmail = email.replace(/([?&|!{}[\]()^~*:\\"'+\-])/g, "\\$1");
    const searchResult = await conn.search(
      `FIND {${escapedEmail}} IN EMAIL FIELDS RETURNING Lead(Id, Email, OwnerId, Owner.Email), Contact(Id, Email, OwnerId, Owner.Email)`
    );

    if (searchResult.searchRecords.length === 0) {
      return null;
    }

    // See if a contact was found first
    const contactQuery = searchResult.searchRecords.filter(
      (record) => record.attributes?.type === SalesforceRecordEnum.CONTACT
    );

    if (contactQuery.length > 0) {
      this.setFallbackToContact(setFallbackToContact);
      return contactQuery[0] as ContactRecord;
    } else {
      // If not fallback to lead
      const leadQuery = searchResult.searchRecords.filter(
        (record) => record.attributes?.type === SalesforceRecordEnum.LEAD
      );
      if (leadQuery.length > 0) {
        return leadQuery[0] as ContactRecord;
      }
    }

    return null;
  }

  async createContacts(
    contactsToCreate: Attendee[],
    organizerEmail?: string,
    calEventResponses?: CalEventResponses | null
  ) {
    const log = logger.getSubLogger({ prefix: [`[createContacts]`] });
    const conn = await this.conn;
    const appOptions = this.getAppOptions();
    const createEventOn = appOptions.createEventOn ?? SalesforceRecordEnum.CONTACT;
    // See if the organizer exists in the CRM
    const organizerId = organizerEmail ? await this.getSalesforceUserIdFromEmail(organizerEmail) : undefined;
    const createdContacts: { id: string; email: string }[] = [];

    log.info("createContacts", safeStringify({ createEventOn, organizerId, contactsToCreate }));

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

    if (!contactsToCreate[0]?.email) {
      this.log.warn(`createContact: no attendee email found `, contactsToCreate);
      return [];
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
          if (createdAccountContacts.length > 0) {
            createdContacts.push(...createdAccountContacts);
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
        if (createdAccountContacts.length > 0) {
          createdContacts.push(...createdAccountContacts);
          contactCreated = true;
        }
      }

      if (!accountId && appOptions.createLeadIfAccountNull && !contactCreated) {
        // Check to see if the lead exists already
        const leadQuery = await conn.query(
          `SELECT Id, Email FROM Lead WHERE Email = '${attendee.email}' LIMIT 1`
        );
        if (leadQuery.records.length > 0) {
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
          } catch (error: unknown) {
            if (error instanceof Error && error.name === "DUPLICATES_DETECTED") {
              // we know it's a DuplicateError now (DUPLICATES_DETECTED)
              const existingId = this.getExistingIdFromDuplicateError(error as SalesforceDuplicateError);
              if (existingId) {
                log.info("Using existing record:", existingId);
                createdContacts.push({ id: existingId, email: attendee.email });
              }
            } else {
              log.error("Error creating lead:", error);
            }
          }
        }
      }
    }

    if (createdContacts.length === 0) {
      // This should never happen
      log.error(`No contacts created for these app options ${safeStringify(appOptions)}`);
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
        deleted: null,
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
            [sendNoShowAttendeeDataField as string]: noShowData.noShow,
          });
        }
      }
    }
  }

  private getExistingIdFromDuplicateError(error: SalesforceDuplicateError): string | null {
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

  private getDominantAccountId(contacts: GetDominantAccountIdInput) {
    return getDominantAccountId(contacts);
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
    const log = logger.getSubLogger({ prefix: [`[createAttendeeRecord]:${attendee.email}`] });
    log.info("createAttendeeRecord", safeStringify({ attendee, recordType, organizerId, accountId }));
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
    const log = logger.getSubLogger({ prefix: [`[ensureFieldsExistOnObject]`] });
    const conn = await this.conn;

    const fieldSet = new Set(fieldsToTest);
    const foundFields: Field[] = [];

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
      log.error(`Error ensuring fields ${fieldsToTest} exist on object ${sobject} with error ${e}`);
      return [];
    }
  }

  private async checkRecordOwnerNameFromRecordId(id: string, newOwnerId: string) {
    const conn = await this.conn;
    const appOptions = this.getAppOptions();

    this.log.info(`Changing owner for record ${id}`);

    const recordType = this.determineRecordTypeById(id);

    if (!appOptions?.onBookingChangeRecordOwnerName) {
      this.log.warn(
        `No appOptions.onBookingChangeRecordOwnerName found for ${this.integrationName} on checkRecordOwnerNameFromRecordId`
      );
      return;
    }

    // Get the associated record that the event was created on
    const recordQuery = (await conn.query(
      `SELECT OwnerId, Owner.Name FROM ${recordType} WHERE Id = '${id}'`
    )) as { records: { OwnerId: string; Owner: { Name: string } }[] };

    if (!recordQuery || !recordQuery.records.length) {
      this.log.warn(`Could not find record for id ${id} and type ${recordType}`);
    }

    const owner = recordQuery.records[0].Owner;

    if (!appOptions.onBookingChangeRecordOwnerName.includes(owner?.Name)) {
      this.log.warn(
        `Current owner name ${owner?.Name} for record ${id} does not match the option ${appOptions.onBookingChangeRecordOwnerName}`
      );
    }

    await conn
      .sobject(recordType)
      .update({
        // First field is there WHERE statement
        Id: id,
        OwnerId: newOwnerId,
      })
      .catch((error) => {
        this.log.warn(
          `Error changing record ${id} of type ${recordType} owner to ${newOwnerId} with error ${JSON.stringify(
            error
          )}`
        );
      });
  }

  public getAllPossibleAccountWebsiteFromEmailDomain(emailDomain: string) {
    const websites = getAllPossibleWebsiteValuesFromEmailDomain(emailDomain);
    // Format for SOQL query
    return websites.map((website) => `'${website}'`).join(", ");
  }

  private async getAccountIdBasedOnEmailDomainOfContacts(email: string) {
    const conn = await this.conn;
    const emailDomain = email.split("@")[1];
    const log = logger.getSubLogger({ prefix: [`[getAccountIdBasedOnEmailDomainOfContacts]:${email}`] });
    log.info("getAccountIdBasedOnEmailDomainOfContacts", safeStringify({ email, emailDomain }));
    // First check if an account has the same website as the email domain of the attendee
    const accountQuery = await conn.query(
      `SELECT Id, Website FROM Account WHERE Website IN (${this.getAllPossibleAccountWebsiteFromEmailDomain(
        emailDomain
      )}) LIMIT 1`
    );
    if (accountQuery.records.length > 0) {
      const account = accountQuery.records[0] as { Id: string; Website: string };
      log.info(
        "Found account based on email domain",
        safeStringify({ emailDomain, accountWebsite: account.Website, accountId: account.Id })
      );
      return account.Id;
    }

    // Fallback to querying which account the majority of contacts are under
    const response = await conn.query(
      `SELECT Id, Email, AccountId FROM Contact WHERE Email LIKE '%@${emailDomain}' AND AccountId != null`
    );

    const accountId = this.getDominantAccountId(response.records as { AccountId: string }[]);

    if (accountId) {
      log.info("Found account based on other contacts", safeStringify({ accountId }));
    } else {
      log.info("No account found");
    }

    return accountId;
  }

  private setFallbackToContact(boolean: boolean) {
    this.fallbackToContact = boolean;
  }

  private getFallbackToContact() {
    return this.fallbackToContact;
  }

  private async writeToRecord({
    recordId,
    startTime,
    fieldsToWriteTo,
    organizerEmail,
    calEventResponses,
    bookingUid,
  }: {
    recordId: string;
    startTime: string;
    fieldsToWriteTo: Record<string, z.infer<typeof writeToBookingEntry>>;
    organizerEmail?: string;
    calEventResponses?: CalEventResponses | null;
    bookingUid?: string | null;
  }) {
    const conn = await this.conn;
    // Determine record type (Contact, Lead, etc)
    const personRecordType = this.determineRecordTypeById(recordId);
    // Search the fields and ensure 1. they exist 2. they're the right type
    const fieldsToWriteOn = Object.keys(fieldsToWriteTo);
    const existingFields = await this.ensureFieldsExistOnObject(fieldsToWriteOn, personRecordType);
    if (!existingFields.length) {
      this.log.warn(`No fields found for record type ${personRecordType}`);
      return;
    }

    const personRecord = await this.fetchPersonRecord(recordId, existingFields, personRecordType);
    if (!personRecord) {
      this.log.warn(`No personRecord found for contactId ${recordId}`);
      return;
    }

    this.log.info(`Writing to recordId ${recordId} on fields ${fieldsToWriteOn}`);

    const writeOnRecordBody = await this.buildRecordUpdatePayload({
      existingFields,
      personRecord,
      fieldsToWriteTo,
      startTime,
      bookingUid,
      organizerEmail,
      calEventResponses,
      recordId,
    });

    this.log.info(
      `Final writeOnRecordBody contains fields ${Object.keys(writeOnRecordBody)} for record ${recordId}`
    );

    // Update the person record
    await conn
      .sobject(personRecordType)
      .update({
        Id: recordId,
        ...writeOnRecordBody,
      })
      .catch((e) => {
        this.log.error(`Error updating person record for contactId ${recordId}`, e);
      });
  }

  private async buildRecordUpdatePayload({
    existingFields,
    personRecord,
    fieldsToWriteTo,
    startTime,
    bookingUid,
    organizerEmail,
    calEventResponses,
    recordId,
  }: {
    existingFields: Field[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    personRecord: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fieldsToWriteTo: Record<string, any>;
    startTime?: string;
    bookingUid?: string | null;
    organizerEmail?: string;
    calEventResponses?: CalEventResponses | null;
    recordId: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }): Promise<Record<string, any>> {
    const log = logger.getSubLogger({ prefix: [`[buildRecordUpdatePayload] ${recordId}`] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const writeOnRecordBody: Record<string, any> = {};
    let fieldTypeHandled = false;

    for (const field of existingFields) {
      const fieldConfig = fieldsToWriteTo[field.name];

      if (!fieldConfig) {
        log.error(`No field config found for field ${field.name}`);
        continue;
      }

      log.info(
        `Processing field ${field.name} with type ${field.type} and config ${JSON.stringify(fieldConfig)}`
      );

      // Skip if field should only be written when empty and already has a value
      if (fieldConfig.whenToWrite === WhenToWriteToRecord.FIELD_EMPTY && personRecord[field.name]) {
        log.info(
          `Field ${field.name} on contactId ${personRecord?.Id} already exists with value ${
            personRecord[field.name]
          }`
        );
        continue;
      }

      if (fieldConfig.fieldType === SalesforceFieldType.CUSTOM) {
        fieldTypeHandled = true;
        const extractedValue = await this.getTextFieldValue({
          fieldValue: fieldConfig.value,
          fieldLength: field.length,
          calEventResponses,
          bookingUid,
          recordId,
          fieldName: field.name,
        });
        if (extractedValue) {
          writeOnRecordBody[field.name] = extractedValue;
          continue;
        }
      }

      // Handle different field types
      if (
        field.type === SalesforceFieldType.TEXT ||
        field.type === SalesforceFieldType.TEXTAREA ||
        field.type === SalesforceFieldType.PHONE
      ) {
        fieldTypeHandled = true;
        const extractedText = await this.getTextFieldValue({
          fieldValue: fieldConfig.value,
          fieldLength: field.length,
          calEventResponses,
          bookingUid,
          recordId,
          fieldName: field.name,
        });
        if (extractedText) {
          writeOnRecordBody[field.name] = extractedText;
          continue;
        }
      } else if (
        (field.type === SalesforceFieldType.DATE || field.type === SalesforceFieldType.DATETIME) &&
        startTime &&
        organizerEmail
      ) {
        fieldTypeHandled = true;
        const dateValue = await this.getDateFieldValue(
          fieldConfig.value,
          startTime,
          bookingUid,
          organizerEmail
        );
        if (dateValue) {
          writeOnRecordBody[field.name] = dateValue;
          continue;
        }
      } else if (field.type === SalesforceFieldType.PICKLIST) {
        fieldTypeHandled = true;
        const picklistValue = await this.getPicklistFieldValue({
          fieldConfigValue: fieldConfig.value,
          salesforceField: field,
          calEventResponses,
          bookingUid,
          recordId,
        });
        if (picklistValue) {
          writeOnRecordBody[field.name] = picklistValue;
          continue;
        }
      } else if (field.type === SalesforceFieldType.CHECKBOX) {
        fieldTypeHandled = true;
        // If the checkbox field value is not a boolean for some reason, default to if it's a falsely value
        const checkboxValue = !!fieldConfig.value;
        writeOnRecordBody[field.name] = checkboxValue;
        continue;
      }

      if (!fieldTypeHandled) {
        log.error(`Salesforce field type ${field.type} not handled for fieldConfig ${fieldConfig}`);
      }
      log.error(
        `No value found for field ${field.name} with value ${
          personRecord[field.name]
        }, field config ${JSON.stringify(fieldConfig)} and Salesforce config ${JSON.stringify(field)}`
      );
    }
    return writeOnRecordBody;
  }

  private async generateWriteToEventBody(event: CalendarEvent) {
    const appOptions = this.getAppOptions();

    const customFieldInputsEnabled =
      appOptions?.onBookingWriteToEventObject && appOptions?.onBookingWriteToEventObjectMap;

    if (!customFieldInputsEnabled) return {};

    if (!appOptions?.onBookingWriteToEventObjectMap) return {};

    const customFieldInputs = customFieldInputsEnabled
      ? await this.ensureFieldsExistOnObject(Object.keys(appOptions.onBookingWriteToEventObjectMap), "Event")
      : [];

    const confirmedCustomFieldInputs: {
      // This is unique to each instance so we don't know the type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: any;
    } = {};

    for (const field of customFieldInputs) {
      confirmedCustomFieldInputs[field.name] = await this.getTextFieldValue({
        fieldValue: appOptions.onBookingWriteToEventObjectMap[field.name],
        fieldLength: field.length,
        calEventResponses: event.responses,
        bookingUid: event?.uid,
        recordId: event?.uid ?? "Cal booking",
        fieldName: field.name,
      });
    }

    return confirmedCustomFieldInputs;
  }

  private async getTextFieldValue({
    fieldValue,
    fieldLength,
    calEventResponses,
    bookingUid,
    recordId,
    fieldName,
  }: {
    fieldValue: string;
    fieldLength?: number;
    calEventResponses?: CalEventResponses | null;
    bookingUid?: string | null;
    recordId: string;
    fieldName: string;
  }) {
    const log = logger.getSubLogger({ prefix: [`[getTextFieldValue]: ${recordId} - ${fieldName}`] });

    // If no {} then indicates we're passing a static value
    if (!fieldValue.startsWith("{") && !fieldValue.endsWith("}")) {
      log.info("Returning static value");
      return fieldValue;
    }

    let valueToWrite = fieldValue;
    if (fieldValue.startsWith("{form:")) {
      // Get routing from response
      if (!bookingUid) {
        log.error(`BookingUid not passed. Cannot get form responses without it`);
        return;
      }
      const formValue = await this.getTextValueFromRoutingFormResponse(fieldValue, bookingUid, recordId);
      valueToWrite = formValue || "";
    } else if (fieldValue.startsWith("{utm:")) {
      if (!bookingUid) {
        log.error(`BookingUid not passed. Cannot get tracking values without it`);
        return;
      }
      valueToWrite = await this.getTextValueFromBookingTracking(fieldValue, bookingUid);
    } else if (fieldValue === "{assignmentReason}") {
      if (!bookingUid) {
        log.error(`BookingUid not passed. Cannot get assignment reason without it`);
        return;
      }
      valueToWrite = await this.getAssignmentReason(bookingUid);
      if (!valueToWrite) {
        log.error(`No assignment reason found for bookingUid ${bookingUid}`);
        return;
      }
    } else {
      // Get the value from the booking response
      if (!calEventResponses) {
        log.error(`CalEventResponses not passed. Cannot get booking form responses`);
        return;
      }
      valueToWrite = this.getTextValueFromBookingResponse(fieldValue, calEventResponses);
    }

    // If a value wasn't found in the responses. Don't return the field name
    if (valueToWrite === fieldValue) {
      log.error("No responses found returning nothing");
      return;
    }

    // Trim incase the replacement values increased the length
    return fieldLength ? valueToWrite.substring(0, fieldLength) : valueToWrite;
  }

  private async getTextValueFromRoutingFormResponse(
    fieldValue: string,
    bookingUid: string,
    recordId: string
  ) {
    const log = logger.getSubLogger({
      prefix: [`[getTextValueFromRoutingFormResponse]: ${recordId} - bookingUid: ${bookingUid}`],
    });

    let value;

    const regex = /\{form:(.*?)\}/;
    const regexMatch = fieldValue.match(regex);
    if (!regexMatch) {
      log.error("Could not find regex match to {form:}");
      return fieldValue;
    }

    const identifierField = regexMatch?.[1];
    if (!identifierField) {
      log.error(`Could not find matching regex string ${regexMatch}`);
      return fieldValue;
    }

    const routingFormResponseDataFactory = new RoutingFormResponseDataFactory({
      logger: log,
      routingFormResponseRepo: new RoutingFormResponseRepository(),
    });
    const findFieldResult = findFieldValueByIdentifier(
      await routingFormResponseDataFactory.createWithBookingUid(bookingUid),
      identifierField
    );
    if (findFieldResult.success) {
      value = findFieldResult.data;
      return String(value);
    }
    log.error(
      `Could not find field value for identifier ${identifierField} in bookingUid ${bookingUid}`,
      `failed with error: ${findFieldResult.error}`
    );
    // If the field is not found, return the original field value
    return fieldValue;
  }

  private async getTextValueFromBookingTracking(fieldValue: string, bookingUid: string) {
    const log = logger.getSubLogger({
      prefix: [`[getTextValueFromBookingTracking]: ${bookingUid}`],
    });
    const tracking = await prisma.tracking.findFirst({
      where: {
        booking: {
          uid: bookingUid,
        },
      },
    });
    if (!tracking) {
      log.warn(`No tracking found for bookingUid ${bookingUid}`);
      return "";
    }

    // Remove the {utm: and trailing } from the field value
    const utmParam = fieldValue.split(":")[1].slice(0, -1);
    return tracking[`utm_${utmParam}` as keyof typeof tracking]?.toString() ?? "";
  }

  private async getAssignmentReason(bookingId: string) {
    const assignmentReason = await PrismaAssignmentReasonRepository.findLatestReasonFromBookingUid(bookingId);
    return assignmentReason?.reasonString ?? "";
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
      if (!organizerEmail) {
        this.log.warn(`No organizer email found for bookingUid ${bookingUid}`);
      }
      const booking = await prisma.booking.findUnique({
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

    if (fieldValue === DateFieldTypeData.BOOKING_CANCEL_DATE) {
      return new Date().toISOString();
    }

    return null;
  }

  private async getPicklistFieldValue({
    fieldConfigValue,
    salesforceField,
    calEventResponses,
    bookingUid,
    recordId,
  }: {
    fieldConfigValue: string;
    salesforceField: Field;
    calEventResponses?: CalEventResponses | null;
    bookingUid?: string | null;
    recordId: string;
  }) {
    const log = logger.getSubLogger({ prefix: [`[getPicklistFieldValue] ${recordId}`] });

    const picklistOptions = salesforceField.picklistValues;
    if (!picklistOptions || !picklistOptions.length) {
      log.warn(`No picklist values found for field ${salesforceField.name}`);
      return null;
    }

    // Get the text value from the field
    const fieldTextValue = await this.getTextFieldValue({
      fieldValue: fieldConfigValue,
      fieldLength: salesforceField.length,
      calEventResponses,
      bookingUid,
      recordId,
      fieldName: salesforceField.name,
    });

    if (!fieldTextValue) {
      log.warn(`No text value found for field ${salesforceField.name}`);
      return null;
    }
    // Get the picklist value from the field
    const picklistValue = picklistOptions.find((option) => option.active && option.value === fieldTextValue);
    if (!picklistValue) {
      log.warn(`No picklist value found for field ${salesforceField.name} and value ${fieldTextValue}`);
      return null;
    }

    return picklistValue.value;
  }

  private async fetchPersonRecord(
    contactId: string,
    existingFields: Field[],
    personRecordType: SalesforceRecordEnum
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<Record<string, any> | null> {
    const conn = await this.conn;
    const existingFieldNames = existingFields.map((field) => field.name);

    const query = await conn.query(
      `SELECT Id, ${existingFieldNames.join(", ")} FROM ${personRecordType} WHERE Id = '${contactId}'`
    );

    if (!query.records.length) {
      this.log.warn(`Could not find person record with id ${contactId}`);
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    const log = logger.getSubLogger({ prefix: [`[createNewContactUnderAnAccount]:${attendee.email}`] });
    log.info("createNewContactUnderAnAccount", safeStringify({ attendee, accountId, organizerId }));
    const conn = await this.conn;

    // First see if the contact already exists and connect it to the account
    const userQuery = await conn.query(
      `SELECT Id, Email FROM Contact WHERE Email = '${attendee.email}' LIMIT 1`
    );
    if (userQuery.records.length > 0) {
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
        // We do not know what fields are included in the account since it's unqiue to each instance
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      fieldValue: onBookingWriteToRecordFields[companyFieldName].value as string,
      fieldLength: defaultTextValueLength,
      calEventResponses,
      recordId: "New lead",
      fieldName: companyFieldName,
    });

    if (companyValue && companyValue === onBookingWriteToRecordFields[companyFieldName].value) return;
    return companyValue;
  }

  private async shouldSkipAttendeeIfFreeEmailDomain(attendeeEmail: string) {
    const appOptions = this.getAppOptions();
    if (!appOptions.ifFreeEmailDomainSkipOwnerCheck) return false;

    const response = await checkIfFreeEmailDomain({ email: attendeeEmail });
    return response;
  }

  async incompleteBookingWriteToRecord(
    email: string,
    writeToRecordObject: z.infer<typeof writeToRecordDataSchema>
  ) {
    const conn = await this.conn;

    // Prioritize contacts over leads
    const personRecord = await this.findProspectByEmail(email);

    if (!personRecord) {
      this.log.info(`No contact or lead found for email ${email}`);
      // No salesforce entity to update, skip and report success (unrecoverable)
      return;
    }

    const recordType = this.determineRecordTypeById(personRecord.Id);

    // Ensure the fields exist on the record
    const existingFields = await this.ensureFieldsExistOnObject(Object.keys(writeToRecordObject), recordType);

    const writeOnRecordBody = await this.buildRecordUpdatePayload({
      existingFields,
      personRecord,
      fieldsToWriteTo: writeToRecordObject,
      recordId: personRecord.Id,
    });
    await conn
      .sobject(recordType)
      .update({
        Id: personRecord.Id,
        ...writeOnRecordBody,
      })
      .catch((e) => {
        const contactId = personRecord?.Id || "unknown";
        // catch the error and throw a new one with a more descriptive message
        const errorMessage = `Error updating person record for contactId '${contactId}': ${
          e instanceof Error ? e.message : String(e)
        }`;
        throw new Error(errorMessage);
      });
  }

  /** All salesforce ids have a 3 character prefix associated with the record type
   * https://help.salesforce.com/s/articleView?id=000385203&type=1
   */
  private determineRecordTypeById(id: string) {
    switch (id.substring(0, 3)) {
      case "003":
        return SalesforceRecordEnum.CONTACT;
      case "001":
        return SalesforceRecordEnum.ACCOUNT;
      case "00Q":
        return SalesforceRecordEnum.LEAD;
      case "00U":
        return SalesforceRecordEnum.EVENT;
      default:
        this.log.warn(`Unhandled record id type ${id}`);
        return SalesforceRecordEnum.CONTACT;
    }
  }

  /** Prioritizes contacts over leads */
  private async findProspectByEmail(email: string) {
    const contact = await this.findContactByEmail(email);
    if (contact) return contact;
    const lead = await this.findLeadByEmail(email);
    if (lead) return lead;
    return null;
  }

  private async findContactByEmail(email: string) {
    const conn = await this.conn;
    const contactsQuery = await conn.query(
      `SELECT Id, Email FROM ${SalesforceRecordEnum.CONTACT} WHERE Email = '${email}' LIMIT 1`
    );

    if (contactsQuery.records.length > 0) {
      return contactsQuery.records[0] as { Id: string; Email: string };
    }
  }

  private async findLeadByEmail(email: string) {
    const conn = await this.conn;
    const leadsQuery = await conn.query(
      `SELECT Id, Email FROM ${SalesforceRecordEnum.LEAD} WHERE Email = '${email}' LIMIT 1`
    );

    if (leadsQuery.records.length > 0) {
      return leadsQuery.records[0] as { Id: string; Email: string };
    }
  }
}
