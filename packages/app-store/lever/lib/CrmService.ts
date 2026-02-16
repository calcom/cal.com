import {
  APP_CREDENTIAL_SHARING_ENABLED,
  CREDENTIAL_SYNC_ENDPOINT,
  CREDENTIAL_SYNC_SECRET,
  CREDENTIAL_SYNC_SECRET_HEADER_NAME,
} from "@calcom/lib/constants";
import { getLocation } from "@calcom/lib/CalEventParser";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type {
  CalendarEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { ContactCreateInput, CRM, Contact } from "@calcom/types/CrmService";

import { invalidateCredential } from "../../_utils/invalidateCredential";
import { OAuthManager } from "../../_utils/oauth/OAuthManager";
import { getTokenObjectFromCredential } from "../../_utils/oauth/getTokenObjectFromCredential";
import { markTokenAsExpired } from "../../_utils/oauth/markTokenAsExpired";
import { updateTokenObjectInDb } from "../../_utils/oauth/updateTokenObject";
import appConfig from "../config.json";
import { getLeverAppKeys } from "./getLeverAppKeys";

type LeverOpportunity = {
  id: string;
  name: string;
  contact: string;
  emails: string[];
  phones: Array<{ type: string; value: string }>;
};

type LeverNote = {
  id: string;
  text: string;
  createdAt: number;
};

class LeverCrmService implements CRM {
  private credential: CredentialPayload;
  private log: typeof logger;
  private auth: OAuthManager;

  constructor(credential: CredentialPayload) {
    this.credential = credential;
    this.log = logger.getSubLogger({ prefix: [`[[lib] ${appConfig.slug}`] });

    const tokenResponse = getTokenObjectFromCredential(credential);

    this.auth = new OAuthManager({
      credentialSyncVariables: {
        APP_CREDENTIAL_SHARING_ENABLED: APP_CREDENTIAL_SHARING_ENABLED,
        CREDENTIAL_SYNC_ENDPOINT: CREDENTIAL_SYNC_ENDPOINT,
        CREDENTIAL_SYNC_SECRET: CREDENTIAL_SYNC_SECRET,
        CREDENTIAL_SYNC_SECRET_HEADER_NAME: CREDENTIAL_SYNC_SECRET_HEADER_NAME,
      },
      resourceOwner: {
        type: credential.teamId ? "team" : "user",
        id: credential.teamId ?? credential.userId,
      },
      appSlug: appConfig.slug,
      currentTokenObject: tokenResponse,
      fetchNewTokenObject: async ({ refreshToken }: { refreshToken: string | null }) => {
        if (!refreshToken) {
          return null;
        }
        const { client_id, client_secret } = await getLeverAppKeys();
        // Lever uses POST body parameters instead of Basic auth header
        return fetch("https://auth.lever.co/oauth/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
            client_id,
            client_secret,
          }),
        });
      },
      isTokenObjectUnusable: async function (response) {
        const myLog = logger.getSubLogger({ prefix: ["lever:isTokenObjectUnusable"] });
        myLog.debug(safeStringify({ status: response.status, ok: response.ok }));
        if (!response.ok) {
          let responseBody;
          try {
            responseBody = await response.clone().json();
          } catch {
            return null;
          }
          myLog.debug(safeStringify({ responseBody }));
          // Lever returns "invalid_grant" when refresh token is invalid
          if (responseBody.error === "invalid_grant") {
            return { reason: responseBody.error };
          }
        }
        return null;
      },
      isAccessTokenUnusable: async function (response) {
        const myLog = logger.getSubLogger({ prefix: ["lever:isAccessTokenUnusable"] });
        myLog.debug(safeStringify({ status: response.status, ok: response.ok }));
        if (!response.ok && response.status === 401) {
          let responseBody;
          try {
            responseBody = await response.clone().json();
          } catch {
            return null;
          }
          myLog.debug(safeStringify({ responseBody }));
          // Lever returns 401 with error when access token is invalid
          if (responseBody.error) {
            return { reason: responseBody.error };
          }
        }
        return null;
      },
      invalidateTokenObject: () => invalidateCredential(credential.id),
      expireAccessToken: () => markTokenAsExpired(credential),
      updateTokenObject: async (newTokenObject) => {
        await updateTokenObjectInDb({
          authStrategy: "oauth",
          credentialId: credential.id,
          tokenObject: newTokenObject,
        });
      },
    });
  }

  private async requestLever<T = unknown>(endpoint: string, options?: RequestInit): Promise<T> {
    await this.auth.getTokenObjectOrFetch();

    const { json } = await this.auth.request({
      url: `https://api.lever.co/v1/${endpoint}`,
      options: {
        method: "GET",
        ...options,
      },
    });

    return json as T;
  }

  async createContacts(contactsToCreate: ContactCreateInput[]): Promise<Contact[]> {
    const result = contactsToCreate.map(async (attendee) => {
      // First, search if opportunity already exists for this email
      const existingOpportunities = await this.getContacts({ emails: attendee.email });
      
      if (existingOpportunities.length > 0) {
        return existingOpportunities[0];
      }

      // If not found, create a new opportunity
      // Lever is opportunity-centric, so we create an opportunity directly
      const [firstName = "", lastName = ""] = attendee.name
        ? attendee.name.split(" ")
        : [attendee.email, ""];

      const bodyData = {
        name: attendee.name || attendee.email,
        emails: [attendee.email],
      };

      try {
        const response = await this.requestLever<{ data: LeverOpportunity }>("opportunities", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bodyData),
        });

        if (response.data) {
          const opportunity = response.data;
          return {
            id: opportunity.id,
            email: opportunity.emails[0] || attendee.email,
            firstName,
            lastName,
            name: opportunity.name,
          };
        }
        throw new Error("Failed to create opportunity");
      } catch (error) {
        this.log.error("Error creating opportunity:", error);
        throw error;
      }
    });

    return await Promise.all(result);
  }

  async getContacts({ emails }: { emails: string | string[] }): Promise<Contact[]> {
    const emailArray = Array.isArray(emails) ? emails : [emails];

    const result = emailArray.map(async (email) => {
      try {
        // Search for opportunities by email
        const response = await this.requestLever<{
          data: LeverOpportunity[];
        }>(`opportunities?email=${encodeURIComponent(email)}`);

        if (response.data && response.data.length > 0) {
          return response.data.map((opportunity) => {
            const [first = "", last = ""] = opportunity.name
              ? opportunity.name.split(" ")
              : [email, ""];
            return {
              id: opportunity.id,
              email: opportunity.emails[0] || email,
              firstName: first,
              lastName: last,
              name: opportunity.name,
            };
          });
        }
        return [];
      } catch (error) {
        this.log.error("Error searching opportunities:", error);
        return [];
      }
    });

    const results = await Promise.all(result);
    return results.flat();
  }

  private getMeetingBody = (event: CalendarEvent): string => {
    return `${event.organizer.language.translate("invitee_timezone")}: ${
      event.attendees[0].timeZone
    }\n\n${event.organizer.language.translate("share_additional_notes")}\n${event.additionalNotes || "-"}`;
  };

  private createLeverNote = async (event: CalendarEvent, contacts: Contact[]) => {
    if (!contacts.length || !contacts[0].id) {
      throw new Error("Cannot create Lever note: no contact/opportunity ID provided");
    }

    const location = getLocation({
      videoCallData: event.videoCallData,
      additionalInformation: event.additionalInformation,
      location: event.location,
      uid: event.uid,
    });

    const noteText = `Booking: ${event.title}\nScheduled: ${new Date(event.startTime).toLocaleString()} - ${new Date(event.endTime).toLocaleString()}\nLocation: ${location}\n\n${this.getMeetingBody(event)}`;

    // Add note to the opportunity
    return this.requestLever<{ data: LeverNote }>(`opportunities/${contacts[0].id}/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: noteText,
      }),
    });
  };

  private deleteNote = async (opportunityId: string, noteId: string) => {
    return this.requestLever(`opportunities/${opportunityId}/notes/${noteId}`, {
      method: "DELETE",
    });
  };

  async handleEventCreation(event: CalendarEvent, contacts: Contact[]) {
    const noteEvent = await this.createLeverNote(event, contacts);

    if (noteEvent.data) {
      this.log.debug("event:creation:ok", { noteId: noteEvent.data.id, opportunityId: contacts[0].id });
      return Promise.resolve({
        uid: `${contacts[0].id}:${noteEvent.data.id}`,
        id: noteEvent.data.id,
        type: appConfig.slug,
        password: "",
        url: "",
        additionalInfo: { contacts, noteEvent },
      });
    }

    this.log.debug("note:creation:notOk", { status: noteEvent.status });
    return Promise.reject("Something went wrong when creating a note in Lever CRM");
  }

  async createEvent(event: CalendarEvent, contacts: Contact[]): Promise<NewCalendarEventType> {
    return await this.handleEventCreation(event, contacts);
  }

  async updateEvent(uid: string, event: CalendarEvent): Promise<NewCalendarEventType> {
    // UID format: opportunityId:noteId
    const [opportunityId, noteId] = uid.split(":");

    // Lever notes may not support PUT — use delete + create for reliability
    try {
      await this.deleteNote(opportunityId, noteId);
    } catch (error) {
      this.log.warn("Failed to delete old note during update, creating new one anyway", { error });
    }

    const contacts: Contact[] = [{ id: opportunityId, email: "", name: "" }];
    const noteEvent = await this.createLeverNote(event, contacts);

    if (noteEvent.data) {
      this.log.debug("event:updation:ok", { noteId: noteEvent.data.id, opportunityId });
      return Promise.resolve({
        uid: `${opportunityId}:${noteEvent.data.id}`,
        id: noteEvent.data.id,
        type: appConfig.slug,
        password: "",
        url: "",
        additionalInfo: { noteEvent },
      });
    }

    this.log.debug("note:updation:notOk", { status: noteEvent.status, opportunityId });
    return Promise.reject("Something went wrong when updating a note in Lever CRM");
  }

  async deleteEvent(uid: string): Promise<void> {
    // UID format: opportunityId:noteId
    const [opportunityId, noteId] = uid.split(":");
    await this.deleteNote(opportunityId, noteId);
  }

  async getAvailability(
    _dateFrom: string,
    _dateTo: string,
    _selectedCalendars: IntegrationCalendar[]
  ): Promise<EventBusyDate[]> {
    return Promise.resolve([]);
  }

  async listCalendars(_event?: CalendarEvent): Promise<IntegrationCalendar[]> {
    return Promise.resolve([]);
  }

  getAppOptions() {
    console.log("No options implemented");
  }

  async handleAttendeeNoShow() {
    console.log("Not implemented");
  }
}

/**
 * Factory function that creates a Lever CRM service instance.
 * This is exported instead of the class to prevent internal types
 * from leaking into the emitted .d.ts file.
 */
export default function BuildCrmService(
  credential: CredentialPayload,
  _appOptions?: Record<string, unknown>
): CRM {
  return new LeverCrmService(credential);
}
