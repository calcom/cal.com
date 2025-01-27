/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client, AssociationTypes } from "@hubspot/api-client";
import { FilterOperatorEnum as CompanyFilterOperatorEnum } from "@hubspot/api-client/lib/codegen/crm/companies";
import type {
  PublicObjectSearchRequest as ContactSearchInput,
  SimplePublicObjectInputForCreate as HubspotContactCreateInput,
  PublicObjectSearchRequest as CompanySearchInput,
} from "@hubspot/api-client/lib/codegen/crm/contacts";
import { FilterOperatorEnum as ContactFilterOperatorEnum } from "@hubspot/api-client/lib/codegen/crm/contacts";
import { AssociationSpecAssociationCategoryEnum as ContactAssociationCategoryEnum } from "@hubspot/api-client/lib/codegen/crm/contacts";
import type {
  SimplePublicObjectInput,
  SimplePublicObjectInputForCreate as MeetingCreateInput,
  PublicAssociationsForObject,
} from "@hubspot/api-client/lib/codegen/crm/objects/meetings";
import { AssociationSpecAssociationCategoryEnum as MeetingAssociationCategoryEnum } from "@hubspot/api-client/lib/codegen/crm/objects/meetings";
import type z from "zod";

import { getLocation } from "@calcom/lib/CalEventParser";
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

interface CustomPublicObjectInput extends SimplePublicObjectInput {
  id?: string;
}

export default class HubspotCalendarService implements CRM {
  private integrationName = "";
  private auth: Promise<{ getToken: () => Promise<HubspotToken | void | never[]> }>;
  private log: typeof logger;
  private client_id = "";
  private client_secret = "";
  private hubspotClient: Client;
  private appOptions: z.infer<typeof appDataSchema>;

  constructor(credential: CredentialPayload, appOptions: any) {
    this.hubspotClient = new Client();

    this.integrationName = "hubspot_other_calendar";

    this.auth = this.hubspotAuth(credential).then((r) => r);

    this.log = logger.getSubLogger({ prefix: [`[[lib] ${this.integrationName}`] });
    this.appOptions = appOptions;
  }

  private getHubspotMeetingBody = (event: CalendarEvent): string => {
    return `<b>${event.organizer.language.translate("invitee_timezone")}:</b> ${
      event.attendees[0].timeZone
    }<br><br><b>${event.organizer.language.translate("share_additional_notes")}</b><br>${
      event.additionalNotes || "-"
    }`;
  };

  private hubspotCreateMeeting = async (event: CalendarEvent, contacts: Contact[]) => {
    try {
      const simplePublicObjectInput: MeetingCreateInput = {
        properties: {
          hs_timestamp: Date.now().toString(),
          hs_meeting_title: event.title,
          hs_meeting_body: this.getHubspotMeetingBody(event),
          hs_meeting_location: getLocation(event),
          hs_meeting_start_time: new Date(event.startTime).toISOString(),
          hs_meeting_end_time: new Date(event.endTime).toISOString(),
          hs_meeting_outcome: "SCHEDULED",
        },
        associations: contacts.reduce((associations, contact) => {
          if (contact.id) {
            associations.push({
              to: {
                id: contact.id,
              },
              types: [
                {
                  associationCategory: MeetingAssociationCategoryEnum.HubspotDefined,
                  associationTypeId: AssociationTypes.meetingToContact,
                },
              ],
            });
          }
          return associations;
        }, [] as PublicAssociationsForObject[]),
      };

      return this.hubspotClient.crm.objects.meetings.basicApi.create(simplePublicObjectInput);
    } catch (e) {
      this.log.warn(`error creating event for bookingUid ${event.uid}, ${e}`);
    }
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

  private hubspotDeleteMeeting = async (uid: string) => {
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
            await this.hubspotClient.oauth.tokensApi.create(
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
    const meetingEvent = await this.hubspotCreateMeeting(event, contacts);

    if (meetingEvent) {
      this.log.debug("meeting:creation:ok", { meetingEvent });
      return Promise.resolve({
        uid: meetingEvent.id,
        id: meetingEvent.id,
        type: "hubspot_other_calendar",
        password: "",
        url: "",
        additionalInfo: { contacts, meetingEvent },
      });
    }
    this.log.debug("meeting:creation:notOk", { meetingEvent, event, contacts });
    return Promise.reject("Something went wrong when creating a meeting in HubSpot");
  }

  async createEvent(event: CalendarEvent, contacts: Contact[]): Promise<CrmEvent> {
    const auth = await this.auth;
    await auth.getToken();

    return await this.handleMeetingCreation(event, contacts);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  async getContacts({ emails }: { emails: string | string[] }): Promise<Contact[]> {
    const auth = await this.auth;
    await auth.getToken();

    const emailArray = Array.isArray(emails) ? emails : [emails];

    const publicObjectSearchRequest: ContactSearchInput = {
      filterGroups: emailArray.map((attendeeEmail) => ({
        filters: [
          {
            value: attendeeEmail,
            propertyName: "email",
            operator: ContactFilterOperatorEnum.Eq,
          },
        ],
      })),
      sorts: ["hs_object_id"],
      properties: ["hs_object_id", "email"],
      limit: 10,
    };

    const contacts = await this.hubspotClient.crm.contacts.searchApi
      .doSearch(publicObjectSearchRequest)
      .then((apiResponse) => apiResponse.results);

    return contacts.map((contact) => {
      return {
        id: contact.id,
        email: contact.properties.email || "",
      };
    });
  }

  async createContacts(contactsToCreate: ContactCreateInput[]): Promise<Contact[]> {
    const auth = await this.auth;
    await auth.getToken();

    const appOptions = this.getAppOptions();
    let companyId: string;

    // Check for a company to associate the contact with
    if (appOptions?.createContactUnderCompany) {
      const emailDomain = contactsToCreate[0].email.split("@")[1];

      const companySearchInput: CompanySearchInput = {
        filterGroups: [
          {
            filters: [
              {
                propertyName: "website",
                operator: CompanyFilterOperatorEnum.ContainsToken,
                value: emailDomain,
              },
            ],
          },
        ],
        properties: ["id"],
        limit: 1,
      };

      const companyQuery = await this.hubspotClient.crm.companies.searchApi
        .doSearch(companySearchInput)
        .then((apiResponse) => apiResponse.results);
      if (companyQuery.length > 0) {
        const company = companyQuery[0];
        companyId = company.id;
      }
    }

    const simplePublicObjectInputs: HubspotContactCreateInput[] = contactsToCreate.map((attendee) => {
      const [firstname, lastname] = attendee.name ? attendee.name.split(" ") : [attendee.email, ""];
      return {
        properties: {
          firstname,
          lastname,
          email: attendee.email,
        },
        ...(companyId && {
          associations: [
            {
              to: {
                id: companyId,
              },
              types: [
                {
                  associationCategory: ContactAssociationCategoryEnum.HubspotDefined,
                  associationTypeId: AssociationTypes.contactToCompany,
                },
              ],
            },
          ],
        }),
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
        email: contact.properties.email || "",
      };
    });
  }

  getAppOptions() {
    return this.appOptions;
  }
}
