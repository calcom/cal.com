/* eslint-disable @typescript-eslint/no-explicit-any */
import * as hubspot from "@hubspot/api-client";
import type { BatchInputPublicAssociation } from "@hubspot/api-client/lib/codegen/crm/associations";
import type { PublicObjectSearchRequest } from "@hubspot/api-client/lib/codegen/crm/contacts";
import type {
  SimplePublicObject,
  SimplePublicObjectInput,
} from "@hubspot/api-client/lib/codegen/crm/objects/meetings";
import type { z } from "zod";

import { getLocation } from "@calcom/lib/CalEventParser";
import getLabelValueMapFromResponses from "@calcom/lib/bookings/getLabelValueMapFromResponses";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { CRM, ContactCreateInput, Contact, CrmEvent } from "@calcom/types/CrmService";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import refreshOAuthTokens from "../../_utils/oauth/refreshOAuthTokens";
import type { HubspotToken } from "../api/callback";
import type { appDataSchema } from "../zod";
import { HubspotRecordEnum } from "./enums";

export default class HubspotCalendarService implements CRM {
  private url = "";
  private integrationName = "";
  private auth: Promise<{ getToken: () => Promise<HubspotToken | void | never[]> }>;
  private log: typeof logger;
  private client_id = "";
  private client_secret = "";
  private hubspotClient: hubspot.Client;
  private appOptions: z.infer<typeof appDataSchema>;

  constructor(credential: CredentialPayload, appOptions?: z.infer<typeof appDataSchema>) {
    this.hubspotClient = new hubspot.Client();

    this.integrationName = "hubspot_other_calendar";

    this.auth = this.hubspotAuth(credential).then((r) => r);

    this.log = logger.getSubLogger({ prefix: [`[[lib] ${this.integrationName}`] });

    this.appOptions = appOptions || {};
  }

  private getHubspotMeetingBody = (event: CalendarEvent): string => {
    const userFields = getLabelValueMapFromResponses(event);
    const plainText = event?.description?.replace(/<\/?[^>]+(>|$)/g, "").replace(/_/g, " ");
    const location = getLocation(event);
    const userFieldsHtml = Object.entries(userFields)
      .map(([key, value]) => {
        const formattedValue = typeof value === "boolean" ? (value ? "Yes" : "No") : value || "-";
        return `<b>${event.organizer.language.translate(key)}:</b> ${formattedValue}`;
      })
      .join("<br><br>");

    return `<b>${event.organizer.language.translate("invitee_timezone")}:</b> ${
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

    return this.hubspotClient.crm.objects.meetings.basicApi.create(simplePublicObjectInput);
  };

  private hubspotAssociate = async (meeting: SimplePublicObject, contacts: Contact[]) => {
    const appOptions = this.getAppOptions();
    const createEventOn = appOptions.createEventOn ?? HubspotRecordEnum.CONTACT;

    // Separate contacts and companies based on recordType
    const contactRecords = contacts.filter((c) => c.recordType !== "company");
    const companyRecords = contacts.filter((c) => c.recordType === "company");

    const results = [];

    if (contactRecords.length > 0) {
      const contactAssociation: BatchInputPublicAssociation = {
        inputs: contactRecords.map((contact) => ({
          _from: { id: meeting.id },
          to: { id: contact.id },
          type: "meeting_event_to_contact",
        })),
      };
      const contactResult = await this.hubspotClient.crm.associations.batchApi.create(
        "meetings",
        "contacts",
        contactAssociation
      );
      results.push(contactResult);
    }

    if (companyRecords.length > 0 || createEventOn === HubspotRecordEnum.COMPANY) {
      const companiesToAssociate = companyRecords.length > 0 ? companyRecords : contacts;
      if (companiesToAssociate.length > 0 && companiesToAssociate[0].recordType === "company") {
        const companyAssociation: BatchInputPublicAssociation = {
          inputs: companiesToAssociate.map((company) => ({
            _from: { id: meeting.id },
            to: { id: company.id },
            type: "meeting_event_to_company",
          })),
        };
        const companyResult = await this.hubspotClient.crm.associations.batchApi.create(
          "meetings",
          "companies",
          companyAssociation
        );
        results.push(companyResult);
      }
    }

    return results.length > 0 ? results[0] : null;
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
    const credentialKey = credential.key as unknown as HubspotToken;
    const isTokenValid = (token: HubspotToken) =>
      token &&
      token.tokenType &&
      token.accessToken &&
      token.expiryDate &&
      (token.expiresIn || token.expiryDate) < Date.now();

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

        this.hubspotClient.setAccessToken(hubspotRefreshToken.accessToken);
      } catch (e: unknown) {
        this.log.error(e);
      }
    };

    return {
      getToken: () =>
        !isTokenValid(credentialKey) ? Promise.resolve([]) : refreshAccessToken(credentialKey.refreshToken),
    };
  };

  async handleMeetingCreation(event: CalendarEvent, contacts: Contact[]) {
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

  async getContacts({ emails }: { emails: string | string[] }): Promise<Contact[]> {
    const auth = await this.auth;
    await auth.getToken();

    const emailArray = Array.isArray(emails) ? emails : [emails];
    const appOptions = this.getAppOptions();
    const createEventOn = appOptions.createEventOn ?? HubspotRecordEnum.CONTACT;


    if (createEventOn === HubspotRecordEnum.CONTACT) {
      const contacts = await this.searchContacts(emailArray);
      // If contacts exist, return them regardless of skipContactCreation
      if (contacts.length > 0) {
        return contacts;
      }
      return [];
    }

    if (createEventOn === HubspotRecordEnum.COMPANY) {
      if (appOptions.checkForContact) {
        const contacts = await this.searchContacts(emailArray);
        if (contacts.length > 0) {
          return contacts;
        }
        // No contact found, fall back to company
        const companies = await this.searchCompanies(emailArray);
        return companies;
      }
      const companies = await this.searchCompanies(emailArray);
      return companies;
    }

    return await this.searchContacts(emailArray);
  }

  private async searchContacts(emailArray: string[]): Promise<Contact[]> {
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
      properties: ["hs_object_id", "email"],
      limit: 10,
      after: 0,
    };

    const contacts = await this.hubspotClient.crm.contacts.searchApi
      .doSearch(publicObjectSearchRequest)
      .then((apiResponse) => apiResponse.results);

    return contacts.map((contact) => {
      return {
        id: contact.id,
        email: contact.properties.email,
      };
    });
  }

  private async searchLeads(emailArray: string[]): Promise<Contact[]> {
    try {
      const publicObjectSearchRequest: PublicObjectSearchRequest = {
        filterGroups: emailArray.map((attendeeEmail) => ({
          filters: [
            {
              value: attendeeEmail,
              propertyName: "hs_lead_email",
              operator: "EQ",
            },
          ],
        })),
        sorts: ["hs_object_id"],
        properties: ["hs_object_id", "hs_lead_email"],
        limit: 10,
        after: 0,
      };

      const leads = await this.hubspotClient.crm.objects.searchApi
        .doSearch("leads", publicObjectSearchRequest)
        .then((apiResponse) => apiResponse.results);

      return leads.map((lead) => {
        return {
          id: lead.id,
          email: lead.properties.hs_lead_email || "",
          recordType: "lead",
        };
      });
    } catch (error) {
      this.log.error("searchLeads:error", { error });
      return [];
    }
  }

  private async searchCompanies(emailArray: string[]): Promise<Contact[]> {
    try {
      const domains = emailArray
        .map((email) => {
          const parts = email.split("@");
          return parts.length > 1 ? parts[1] : "";
        })
        .filter((domain) => domain !== "");

      if (domains.length === 0) {
        return [];
      }

      const publicObjectSearchRequest: PublicObjectSearchRequest = {
        filterGroups: domains.map((domain) => ({
          filters: [
            {
              value: domain,
              propertyName: "domain",
              operator: "EQ",
            },
          ],
        })),
        sorts: ["hs_object_id"],
        properties: ["hs_object_id", "domain", "name"],
        limit: 10,
        after: 0,
      };

      const companies = await this.hubspotClient.crm.companies.searchApi
        .doSearch(publicObjectSearchRequest)
        .then((apiResponse) => apiResponse.results);

      return companies.map((company) => {
        return {
          id: company.id,
          email: company.properties.domain || "",
          recordType: "company",
        };
      });
    } catch (error) {
      this.log.error("searchCompanies:error", { error });
      return [];
    }
  }

  async createContacts(contactsToCreate: ContactCreateInput[]): Promise<Contact[]> {
    const auth = await this.auth;
    await auth.getToken();

    const appOptions = this.getAppOptions();
    const createEventOn = appOptions.createEventOn ?? HubspotRecordEnum.CONTACT;

    if (createEventOn === HubspotRecordEnum.CONTACT && appOptions.skipContactCreation) {
      return [];
    }

    if (createEventOn === HubspotRecordEnum.COMPANY) {
      return await this.createCompanyRecords(contactsToCreate);
    }
    return await this.createContactRecords(contactsToCreate);
  }

  private async createContactRecords(contactsToCreate: ContactCreateInput[]): Promise<Contact[]> {
    const simplePublicObjectInputs = contactsToCreate.map((attendee) => {
      const [firstname, lastname] = attendee.name ? attendee.name.split(" ") : [attendee.email, ""];
      return {
        properties: {
          firstname,
          lastname,
          email: attendee.email,
        },
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

  private async createCompanyRecords(contactsToCreate: ContactCreateInput[]): Promise<Contact[]> {
    const domainMap = new Map<string, ContactCreateInput>();
    contactsToCreate.forEach((attendee) => {
      const parts = attendee.email.split("@");
      if (parts.length > 1) {
        const domain = parts[1];
        if (!domainMap.has(domain)) {
          domainMap.set(domain, attendee);
        }
      }
    });

    const companyInputs = Array.from(domainMap.entries()).map(([domain, attendee]) => {
      return {
        properties: {
          domain,
          name: attendee.name || domain,
        },
      };
    });

    const createdCompanies = await Promise.all(
      companyInputs.map((company) =>
        this.hubspotClient.crm.companies.basicApi.create(company).catch((error) => {
          if (error.body?.message?.includes("Company already exists")) {
            return { id: "", properties: company.properties, error: "exists" };
          }
          throw error;
        })
      )
    );

    const results: Contact[] = [];
    for (const company of createdCompanies) {
      if ((company as any).error === "exists") {
        const existingCompanies = await this.searchCompanies([`user@${company.properties.domain}`]);
        if (existingCompanies.length > 0) {
          results.push(existingCompanies[0]);
        }
      } else if (company.id) {
        results.push({
          id: company.id,
          email: company.properties.domain || "",
          recordType: "company",
        });
      }
    }

    return results;
  }

  getAppOptions() {
    const createEventOn = this.appOptions.createEventOn ?? HubspotRecordEnum.CONTACT;
    if (createEventOn === HubspotRecordEnum.COMPANY) {
      return {
        ...this.appOptions,
        skipContactCreation: false,
      };
    }
    return this.appOptions;
  }

  async handleAttendeeNoShow() {
    console.log("Not implemented");
  }
}
