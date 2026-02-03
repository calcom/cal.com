/* eslint-disable @typescript-eslint/no-explicit-any */

import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { checkIfFreeEmailDomain } from "@calcom/features/watchlist/lib/freeEmailDomainCheck/checkIfFreeEmailDomain";
import getLabelValueMapFromResponses from "@calcom/lib/bookings/getLabelValueMapFromResponses";
import { getLocation } from "@calcom/lib/CalEventParser";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { PrismaTrackingRepository } from "@calcom/lib/server/repository/PrismaTrackingRepository";
import prisma from "@calcom/prisma";
import type { CalEventResponses, CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { Contact, ContactCreateInput, CRM, CrmEvent } from "@calcom/types/CrmService";
import * as hubspot from "@hubspot/api-client";
import type { BatchInputPublicAssociation } from "@hubspot/api-client/lib/codegen/crm/associations";
import type { PublicObjectSearchRequest } from "@hubspot/api-client/lib/codegen/crm/contacts";
import type {
  SimplePublicObject,
  SimplePublicObjectInput,
} from "@hubspot/api-client/lib/codegen/crm/objects/meetings";
import type { z } from "zod";
import { CrmFieldType, DateFieldType } from "../../_lib/crm-enums";
import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import refreshOAuthTokens from "../../_utils/oauth/refreshOAuthTokens";
import type { HubspotToken } from "../api/callback";
import type { appDataSchema } from "../zod";

class HubspotCalendarService implements CRM {
  private url = "";
  private integrationName = "";
  private auth: Promise<{ getToken: () => Promise<HubspotToken | void | never[]> }>;
  private log: typeof logger;
  private client_id = "";
  private client_secret = "";
  private hubspotClient: hubspot.Client;
  private appOptions: z.infer<typeof appDataSchema>;
  private bookingRepository: BookingRepository;
  private trackingRepository: PrismaTrackingRepository;

  constructor(credential: CredentialPayload, appOptions?: z.infer<typeof appDataSchema>) {
    this.hubspotClient = new hubspot.Client();

    this.integrationName = "hubspot_other_calendar";

    this.auth = this.hubspotAuth(credential).then((r) => r);

    this.log = logger.getSubLogger({ prefix: [`[[lib] ${this.integrationName}`] });

    this.appOptions = appOptions || {};
    this.bookingRepository = new BookingRepository(prisma);
    this.trackingRepository = new PrismaTrackingRepository(prisma);
  }

  private getHubspotMeetingBody = (event: CalendarEvent): string => {
    const userFields = getLabelValueMapFromResponses(event);
    const plainText = event?.description?.replace(/<\/?[^>]+(>|$)/g, "").replace(/_/g, " ");
    const location = getLocation({
      videoCallData: event.videoCallData,
      additionalInformation: event.additionalInformation,
      location: event.location,
      uid: event.uid,
    });
    const userFieldsHtml = Object.entries(userFields)
      .map(([key, value]) => {
        const formattedValue = typeof value === "boolean" ? (value ? "Yes" : "No") : value || "-";
        return `<b>${event.organizer.language.translate(key)}:</b> ${formattedValue}`;
      })
      .join("<br><br>");

    const organizerName = event.organizer.name || event.organizer.email;
    const organizerInfo = `<b>${event.organizer.language.translate("organizer")}:</b> ${organizerName} (${event.organizer.email})`;

    return `${organizerInfo}<br><br><b>${event.organizer.language.translate("invitee_timezone")}:</b> ${
      event.attendees[0].timeZone
    }<br><br>${
      event.additionalNotes
        ? `<b>${event.organizer.language.translate("share_additional_notes")}</b><br>${
            event.additionalNotes
          }<br><br>`
        : ""
    }
    ${userFieldsHtml}<br><br>
    <b>${event.organizer.language.translate("where")}:</b> ${location}<br><br>
    ${plainText ? `<b>${event.organizer.language.translate("description")}</b><br>${plainText}` : ""}
  `;
  };

  private async ensureFieldsExistOnMeeting(fieldsToTest: string[]) {
    const log = logger.getSubLogger({ prefix: [`[ensureFieldsExistOnMeeting]`] });
    const fieldSet = new Set(fieldsToTest);
    const foundFields: Array<{ name: string; type: string; [key: string]: any }> = [];

    try {
      const properties = await this.hubspotClient.crm.properties.coreApi.getAll("meetings");

      for (const property of properties.results) {
        if (foundFields.length === fieldSet.size) break;

        if (fieldSet.has(property.name)) {
          foundFields.push(property);
        }
      }

      const foundFieldNames = new Set(foundFields.map((f) => f.name));
      const missingFields = fieldsToTest.filter((field) => !foundFieldNames.has(field));

      if (missingFields.length > 0) {
        log.warn(
          `The following fields do not exist in HubSpot and will be skipped: ${missingFields.join(", ")}. Meeting creation will continue without these fields.`
        );
      }

      return foundFields;
    } catch (e: any) {
      log.error(`Error ensuring fields ${fieldsToTest} exist on Meeting object with error ${e}`);
      // Return empty array to gracefully degrade - meeting creation will proceed without custom field validation
      return [];
    }
  }

  private async getTextValueFromBookingTracking(fieldValue: string, bookingUid: string, fieldName: string) {
    const log = logger.getSubLogger({
      prefix: [`[getTextValueFromBookingTracking]: ${fieldName} - ${bookingUid}`],
    });

    const tracking = await this.trackingRepository.findByBookingUid(bookingUid);

    if (!tracking) {
      log.warn(`No tracking found for bookingUid ${bookingUid}`);
      return "";
    }

    const utmParam = fieldValue.split(":")[1].slice(0, -1);
    return tracking[`utm_${utmParam}` as keyof typeof tracking]?.toString() ?? "";
  }

  private getTextValueFromBookingResponse(fieldValue: string, calEventResponses: CalEventResponses) {
    const regexValueToReplace = /\{(.*?)\}/g;
    return fieldValue.replace(regexValueToReplace, (match, captured) => {
      return calEventResponses[captured]?.value ? calEventResponses[captured].value.toString() : match;
    });
  }

  private async getDateFieldValue(
    fieldValue: string,
    startTime?: string,
    bookingUid?: string | null
  ): Promise<string | null> {
    if (fieldValue === DateFieldType.BOOKING_START_DATE) {
      if (!startTime) {
        this.log.error("StartTime is required for BOOKING_START_DATE but was not provided");
        return null;
      }
      return new Date(startTime).toISOString();
    }

    if (fieldValue === DateFieldType.BOOKING_CREATED_DATE && bookingUid) {
      const booking = await this.bookingRepository.findBookingByUid({ bookingUid });

      if (!booking) {
        this.log.warn(`No booking found for ${bookingUid}`);
        return null;
      }

      return new Date(booking.createdAt).toISOString();
    }

    if (fieldValue === DateFieldType.BOOKING_CANCEL_DATE) {
      return new Date().toISOString();
    }

    return null;
  }

  private async getFieldValue({
    fieldValue,
    fieldType,
    calEventResponses,
    bookingUid,
    startTime,
    fieldName,
  }: {
    fieldValue: string | boolean;
    fieldType: CrmFieldType;
    calEventResponses?: CalEventResponses | null;
    bookingUid?: string | null;
    startTime?: string;
    fieldName: string;
  }): Promise<string | boolean | null> {
    const log = logger.getSubLogger({ prefix: [`[getFieldValue]: ${fieldName}`] });

    if (fieldType === CrmFieldType.CHECKBOX) {
      return !!fieldValue;
    }

    if (fieldType === CrmFieldType.DATE || fieldType === CrmFieldType.DATETIME) {
      return await this.getDateFieldValue(fieldValue as string, startTime, bookingUid);
    }

    if (
      fieldType === CrmFieldType.TEXT ||
      fieldType === CrmFieldType.STRING ||
      fieldType === CrmFieldType.PHONE ||
      fieldType === CrmFieldType.TEXTAREA ||
      fieldType === CrmFieldType.CUSTOM
    ) {
      if (typeof fieldValue !== "string") {
        log.error(`Expected string value for field ${fieldName}, got ${typeof fieldValue}`);
        return null;
      }

      if (!fieldValue.startsWith("{") && !fieldValue.endsWith("}")) {
        log.info("Returning static value");
        return fieldValue;
      }

      let valueToWrite = fieldValue;

      // Extract from UTM tracking
      if (fieldValue.startsWith("{utm:")) {
        if (!bookingUid) {
          log.error(`BookingUid not passed. Cannot get tracking values without it`);
          return null;
        }
        valueToWrite = await this.getTextValueFromBookingTracking(fieldValue, bookingUid, fieldName);
      } else {
        // Extract from booking form responses
        if (!calEventResponses) {
          log.error(`CalEventResponses not passed. Cannot get booking form responses`);
          return null;
        }
        valueToWrite = this.getTextValueFromBookingResponse(fieldValue, calEventResponses);
      }

      if (valueToWrite === fieldValue) {
        log.error("No responses found returning nothing");
        return null;
      }

      return valueToWrite;
    }

    log.error(`Unsupported field type ${fieldType} for field ${fieldName}`);
    return null;
  }

  private async generateWriteToMeetingBody(event: CalendarEvent) {
    const appOptions = this.getAppOptions();

    const customFieldInputsEnabled =
      appOptions?.onBookingWriteToEventObject && appOptions?.onBookingWriteToEventObjectFields;

    if (!customFieldInputsEnabled) return {};

    if (!appOptions?.onBookingWriteToEventObjectFields) return {};

    const customFieldInputs = customFieldInputsEnabled
      ? await this.ensureFieldsExistOnMeeting(Object.keys(appOptions.onBookingWriteToEventObjectFields))
      : [];

    const confirmedCustomFieldInputs: Record<string, any> = {};

    for (const field of customFieldInputs) {
      const fieldConfig = appOptions.onBookingWriteToEventObjectFields[field.name];

      const fieldValue = await this.getFieldValue({
        fieldValue: fieldConfig.value,
        fieldType: fieldConfig.fieldType,
        calEventResponses: event.responses,
        bookingUid: event?.uid,
        startTime: event.startTime,
        fieldName: field.name,
      });

      if (fieldValue !== null) {
        confirmedCustomFieldInputs[field.name] = fieldValue;
      }
    }

    this.log.info(`Writing to meeting fields: ${Object.keys(confirmedCustomFieldInputs)}`);

    return confirmedCustomFieldInputs;
  }

  private hubspotCreateMeeting = async (event: CalendarEvent, hubspotOwnerId?: string) => {
    const writeToMeetingRecord = await this.generateWriteToMeetingBody(event);

    const properties: Record<string, string> = {
      hs_timestamp: Date.now().toString(),
      hs_meeting_title: event.title,
      hs_meeting_body: this.getHubspotMeetingBody(event),
      hs_meeting_location: getLocation({
        videoCallData: event.videoCallData,
        additionalInformation: event.additionalInformation,
        location: event.location,
        uid: event.uid,
      }),
      hs_meeting_start_time: new Date(event.startTime).toISOString(),
      hs_meeting_end_time: new Date(event.endTime).toISOString(),
      hs_meeting_outcome: "SCHEDULED",
      ...writeToMeetingRecord,
    };

    if (hubspotOwnerId) {
      properties.hubspot_owner_id = hubspotOwnerId;
      this.log.debug("hubspot:meeting:setting_owner", { hubspotOwnerId });
    }

    const simplePublicObjectInput: SimplePublicObjectInput = {
      properties,
    };

    return this.hubspotClient.crm.objects.meetings.basicApi.create(simplePublicObjectInput);
  };

  private hubspotAssociate = async (meeting: SimplePublicObject, contacts: Array<{ id: string }>) => {
    const batchInputPublicAssociation: BatchInputPublicAssociation = {
      inputs: contacts.map((contact: { id: string }) => ({
        _from: { id: meeting.id },
        to: { id: contact.id },
        type: "meeting_event_to_contact",
      })),
    };
    return this.hubspotClient.crm.associations.batchApi.create(
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
        hs_meeting_location: getLocation({
          videoCallData: event.videoCallData,
          additionalInformation: event.additionalInformation,
          location: event.location,
          uid: event.uid,
        }),
        hs_meeting_start_time: new Date(event.startTime).toISOString(),
        hs_meeting_end_time: new Date(event.endTime).toISOString(),
        hs_meeting_outcome: "RESCHEDULED",
      },
    };

    return this.hubspotClient.crm.objects.meetings.basicApi.update(uid, simplePublicObjectInput);
  };

  private hubspotCancelMeeting = async (uid: string) => {
    const simplePublicObjectInput: SimplePublicObjectInput = {
      properties: {
        hs_meeting_outcome: "CANCELED",
      },
    };

    return this.hubspotClient.crm.objects.meetings.basicApi.update(uid, simplePublicObjectInput);
  };

  private hubspotArchiveMeeting = async (uid: string) => {
    return this.hubspotClient.crm.objects.meetings.basicApi.archive(uid);
  };

  private hubspotAuth = async (credential: CredentialPayload) => {
    const appKeys = await getAppKeysFromSlug("hubspot");
    if (typeof appKeys.client_id === "string") this.client_id = appKeys.client_id;
    if (typeof appKeys.client_secret === "string") this.client_secret = appKeys.client_secret;
    if (!this.client_id) throw new HttpError({ statusCode: 400, message: "Hubspot client_id missing." });
    if (!this.client_secret)
      throw new HttpError({ statusCode: 400, message: "Hubspot client_secret missing." });
    let currentToken = credential.key as unknown as HubspotToken;

    const isTokenValid = (token: HubspotToken) =>
      token && token.tokenType && token.accessToken && token.expiryDate && token.expiryDate > Date.now();

    const refreshAccessToken = async (refreshToken: string) => {
      try {
        const hubspotRefreshToken: HubspotToken = await refreshOAuthTokens(
          async () =>
            await this.hubspotClient.oauth.tokensApi.createToken(
              "refresh_token",
              undefined,
              `${WEBAPP_URL}/api/integrations/hubspot/callback`,
              this.client_id,
              this.client_secret,
              refreshToken
            ),
          "hubspot",
          credential.userId
        );
        hubspotRefreshToken.expiryDate = Math.round(Date.now() + hubspotRefreshToken.expiresIn * 1000);
        await prisma.credential.update({
          where: {
            id: credential.id,
          },
          data: {
            key: hubspotRefreshToken as any,
          },
        });

        this.hubspotClient.setAccessToken(hubspotRefreshToken.accessToken);
        currentToken = { ...currentToken, ...hubspotRefreshToken };
      } catch (e: unknown) {
        this.log.error(e);
      }
    };

    return {
      getToken: async () => {
        if (!isTokenValid(currentToken)) {
          await refreshAccessToken(currentToken.refreshToken);
        } else {
          this.hubspotClient.setAccessToken(currentToken.accessToken);
        }
      },
    };
  };

  async handleMeetingCreation(event: CalendarEvent, contacts: Contact[]) {
    const contactIds: { id?: string }[] = contacts.map((contact) => ({ id: contact.id }));

    const organizerEmail = event.organizer.email;
    this.log.debug("hubspot:meeting:fetching_owner");

    const hubspotOwnerId = await this.getHubspotOwnerIdFromEmail(organizerEmail);

    const meetingEvent = await this.hubspotCreateMeeting(event, hubspotOwnerId ?? undefined);
    if (meetingEvent) {
      this.log.debug("meeting:creation:ok", { meetingId: meetingEvent.id, hubspotOwnerId });
      const associatedMeeting = await this.hubspotAssociate(meetingEvent, contactIds as any);
      if (associatedMeeting) {
        this.log.debug("association:creation:ok", { associatedMeeting });

        const firstContact = contacts[0];
        const appOptions = this.getAppOptions();
        if (hubspotOwnerId && firstContact?.id && appOptions?.setOrganizerAsOwner) {
          await this.setContactOwnerIfAllowed(
            firstContact.id,
            hubspotOwnerId,
            appOptions?.overwriteContactOwner ?? false
          );
        }

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

  async createEvent(event: CalendarEvent, contacts: Contact[]): Promise<CrmEvent> {
    const auth = await this.auth;
    await auth.getToken();

    return await this.handleMeetingCreation(event, contacts);
  }

  async updateEvent(uid: string, event: CalendarEvent): Promise<any> {
    const auth = await this.auth;
    await auth.getToken();
    return await this.hubspotUpdateMeeting(uid, event);
  }

  async deleteEvent(uid: string, event: CalendarEvent): Promise<void> {
    const auth = await this.auth;
    await auth.getToken();

    if (event?.hasOrganizerChanged) {
      await this.hubspotArchiveMeeting(uid);
      return;
    }
    await this.hubspotCancelMeeting(uid);
  }

  async getContacts({
    emails,
    includeOwner,
    forRoundRobinSkip,
  }: {
    emails: string | string[];
    includeOwner?: boolean;
    forRoundRobinSkip?: boolean;
  }): Promise<Contact[]> {
    const auth = await this.auth;
    await auth.getToken();

    const emailArray = Array.isArray(emails) ? emails : [emails];

    const shouldIncludeOwner = includeOwner || forRoundRobinSkip;

    const skipDueToFreeEmail =
      forRoundRobinSkip && (await this.shouldSkipAttendeeIfFreeEmailDomain(emailArray[0]));

    const publicObjectSearchRequest: PublicObjectSearchRequest = {
      filterGroups: emailArray.map((attendeeEmail) => ({
        filters: [
          {
            value: attendeeEmail,
            propertyName: "email",
            operator: "EQ",
          },
        ],
      })),
      sorts: ["hs_object_id"],
      properties:
        shouldIncludeOwner && !skipDueToFreeEmail
          ? ["hs_object_id", "email", "hubspot_owner_id"]
          : ["hs_object_id", "email"],
      limit: 10,
      after: 0,
    };

    const contacts = await this.hubspotClient.crm.contacts.searchApi
      .doSearch(publicObjectSearchRequest)
      .then((apiResponse) => apiResponse.results);

    if (shouldIncludeOwner && !skipDueToFreeEmail) {
      return await Promise.all(
        contacts.map(async (contact) => {
          const ownerId = contact.properties.hubspot_owner_id;
          let ownerEmail: string | undefined;

          if (ownerId) {
            ownerEmail = await this.getOwnerEmailFromId(ownerId);
          }

          return {
            id: contact.id,
            email: contact.properties.email,
            ownerId,
            ownerEmail,
            recordType: "CONTACT",
          };
        })
      );
    }

    return contacts.map((contact) => {
      return {
        id: contact.id,
        email: contact.properties.email,
      };
    });
  }

  async createContacts(contactsToCreate: ContactCreateInput[]): Promise<Contact[]> {
    const auth = await this.auth;
    await auth.getToken();

    const simplePublicObjectInputs = contactsToCreate.map((attendee) => {
      const [firstname, lastname] = attendee.name ? attendee.name.split(" ") : [attendee.email, ""];
      const properties: Record<string, string> = {
        firstname,
        lastname,
        email: attendee.email,
      };
      
      if (attendee.phone) {
        properties.phone = attendee.phone;
      }
      
      return {
        properties,
      };
    });
    const createdContacts = await Promise.all(
      simplePublicObjectInputs.map((contact) =>
        this.hubspotClient.crm.contacts.basicApi.create(contact).catch((error) => {
          // If multiple events are created, subsequent events may fail due to
          // contact was created by previous event creation, so we introduce a
          // fallback taking advantage of the error message providing the contact id
          if (error.body.message.includes("Contact already exists. Existing ID:")) {
            const split = error.body.message.split("Contact already exists. Existing ID: ");
            return { id: split[1], properties: contact.properties };
          } else {
            throw error;
          }
        })
      )
    );

    return createdContacts.map((contact) => {
      return {
        id: contact.id,
        email: contact.properties.email,
      };
    });
  }

  getAppOptions() {
    return this.appOptions;
  }

  async handleAttendeeNoShow() {
    console.log("Not implemented");
  }

  private async getHubspotOwnerIdFromEmail(email: string): Promise<string | null> {
    try {
      const ownersResponse = await this.hubspotClient.crm.owners.ownersApi.getPage(
        email,
        undefined,
        100,
        false
      );
      if (ownersResponse.results && ownersResponse.results.length > 0) {
        const owner = ownersResponse.results.find((o) => o.email?.toLowerCase() === email.toLowerCase());
        return owner?.id ?? null;
      }
      return null;
    } catch (error) {
      this.log.error("Error fetching HubSpot owner:", error);
      return null;
    }
  }

  private async setContactOwner(contactId: string, ownerId: string): Promise<void> {
    try {
      await this.hubspotClient.crm.contacts.basicApi.update(contactId, {
        properties: { hubspot_owner_id: ownerId },
      });
    } catch (error) {
      this.log.error("Error setting contact owner:", error);
    }
  }

  private async getContactOwnerId(contactId: string): Promise<string | null> {
    const contact = await this.hubspotClient.crm.contacts.basicApi.getById(contactId, ["hubspot_owner_id"]);
    return contact.properties.hubspot_owner_id ?? null;
  }

  private async setContactOwnerIfAllowed(
    contactId: string,
    ownerId: string,
    overwriteContactOwner: boolean
  ): Promise<void> {
    if (overwriteContactOwner) {
      await this.setContactOwner(contactId, ownerId);
      return;
    }

    try {
      const currentOwnerId = await this.getContactOwnerId(contactId);
      if (!currentOwnerId) {
        await this.setContactOwner(contactId, ownerId);
      }
    } catch (error) {
      this.log.error("Error fetching contact owner, skipping owner update:", error);
    }
  }

  private async getOwnerEmailFromId(ownerId: string): Promise<string | undefined> {
    try {
      const owner = await this.hubspotClient.crm.owners.ownersApi.getById(parseInt(ownerId, 10));
      return owner.email ?? undefined;
    } catch (error) {
      this.log.error("Error fetching owner by ID:", error);
      return undefined;
    }
  }

  private async shouldSkipAttendeeIfFreeEmailDomain(attendeeEmail: string): Promise<boolean> {
    const appOptions = this.getAppOptions();
    if (!appOptions.ifFreeEmailDomainSkipOwnerCheck) return false;

    const response = await checkIfFreeEmailDomain({ email: attendeeEmail });
    return response;
  }
}

/**
 * Factory function that creates a HubSpot CRM service instance.
 * This is exported instead of the class to prevent SDK types (like hubspot.Client)
 * from leaking into the emitted .d.ts file, which would cause TypeScript to load
 * all 1,800+ HubSpot SDK declaration files when type-checking dependent packages.
 */
export default function BuildCrmService(
  credential: CredentialPayload,
  appOptions?: Record<string, unknown>
): CRM {
  return new HubspotCalendarService(credential, appOptions);
}
