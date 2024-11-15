import type { Prisma } from "@prisma/client";
import type { ActivityResponseObject, AddActivityRequest, OAuth2Configuration } from "pipedrive";
import { ActivitiesApi, Configuration, PersonsApi } from "pipedrive";

import dayjs from "@calcom/dayjs";
import { getLocation } from "@calcom/lib/CalEventParser";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type {
  CalendarEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { Contact, ContactCreateInput, CRM } from "@calcom/types/CrmService";

import appConfig from "../config.json";
import { getOAuthClientFromCredential, pipedriveAppKeysSchema } from "./util";

export default class PipedriveCrmService implements CRM {
  private log: typeof logger;
  private credentials: CredentialPayload;
  private oAuth2Config: OAuth2Configuration;

  constructor(credential: CredentialPayload) {
    this.oAuth2Config = getOAuthClientFromCredential(credential);
    const parsedCredentialKey = pipedriveAppKeysSchema.safeParse(credential.key);
    if (parsedCredentialKey.success) {
      this.credentials = credential;
      if (parsedCredentialKey.data.tokens) {
        this.oAuth2Config.updateToken(parsedCredentialKey.data.tokens);
      }
    } else {
      throw Error(
        `No API tokens found for userId ${credential.userId} and appId ${credential.appId}: ${parsedCredentialKey.error}`
      );
    }
    this.log = logger.getSubLogger({ prefix: [`[[lib] ${appConfig.slug}`] });
  }

  private getPipedriveActivityFromCalendarEvent(
    event: CalendarEvent,
    contacts: Contact[] = []
  ): AddActivityRequest {
    return {
      due_date: dayjs(event.startTime).format("YYYY-MM-DD"),
      due_time: dayjs(event.startTime).format("HH:mm"),
      duration: dayjs.duration(dayjs(event.endTime).diff(dayjs(event.startTime))).format("HH:mm"),
      subject: event.title,
      note: this.getMeetingBody(event),
      location: getLocation(event),
      person_id: event.organizer.id,
      attendees: event.attendees.map((attendee) => ({ email_address: attendee.email })),
      participants: contacts.map((contact) => ({ person_id: contact.id, primary_flag: false })),
      type: event.type,
    } as AddActivityRequest;
  }

  private getNewCalendarEventFromPipedriveActivity = (
    activity: ActivityResponseObject,
    contacts: Contact[] = []
  ): NewCalendarEventType => {
    return {
      uid: activity.id?.toString(),
      id: activity.id?.toString(),
      title: activity.subject,
      type: activity.type,
      password: "",
      url: "",
      location: activity.location,
      additionalInfo: { ...activity, contacts },
    } as NewCalendarEventType;
  };

  private getConfig = async () => {
    const parsedCredentialKey = pipedriveAppKeysSchema.safeParse(this.credentials.key);
    if (parsedCredentialKey.success && parsedCredentialKey.data.tokens) {
      const creds = parsedCredentialKey.data;
      const tokens = creds.tokens;

      const isExpired =
        creds.last_refresh === undefined ||
        tokens === undefined ||
        (Date.now() - creds.last_refresh) / 1000 > tokens.expires_in;
      if (isExpired) {
        const updateTokens = await this.oAuth2Config.tokenRefresh().then(
          (tokenResp) => {
            console.debug("Token refreshed");
            const newAppKeys = { ...creds, tokens: tokenResp, last_refresh: Date.now() };
            this.credentials.key = newAppKeys as Prisma.JsonValue;
            return prisma.credential.update({
              where: {
                id: this.credentials.id,
              },
              data: {
                key: newAppKeys,
              },
            });
          },
          (exception) => {
            console.error("Token refresh failed", { exception });
          }
        );

        if (updateTokens) {
          console.debug("Token updated in DB");
        }
      }
    }

    return new Configuration({
      accessToken: this.oAuth2Config.getAccessToken,
      basePath: this.oAuth2Config.basePath,
    });
  };

  async createContacts(contactsToCreate: ContactCreateInput[]): Promise<Contact[]> {
    const apiInstance = new PersonsApi(await this.getConfig());
    const result = contactsToCreate.map(async (attendee) => {
      try {
        const response = await apiInstance.addPerson({
          AddPersonRequest: {
            name: !!attendee.name ? attendee.name : attendee.email,
            email: [{ value: attendee.email }],
          },
        });
        if (!response.success) {
          throw new Error(`Reponse unsucessful: ${response}`);
        }
        const result = response.data;
        return result;
      } catch (error) {
        console.error("Error creating contact", { attendee, error });
        throw error;
      }
    });

    const results = await Promise.all(result);
    return results
      .filter((r) => r !== undefined)
      .map((result) => ({
        id: (result.id as number).toString(),
        name: result.name,
        email: result.email?.[0].value as string,
        ownerId: (result.owner_id?.id ?? result.owner_id?.value)?.toString(),
        ownerEmail: result.owner_id?.email,
      }));
  }

  async getContacts({ emails }: { emails: string | string[] }): Promise<Contact[]> {
    const emailArray = Array.isArray(emails) ? emails : [emails];
    const apiInstance = new PersonsApi(await this.getConfig());

    const apiResults = emailArray.map(async (attendeeEmail) => {
      try {
        const response = await apiInstance.searchPersons({
          fields: "email",
          term: attendeeEmail,
        });
        const result = response.data?.items?.sort((a, b) => (b.result_score ?? 0) - (a.result_score ?? 0))[0];
        return result?.item;
      } catch (error) {
        console.error("Error finding contact", { error });
        return Promise.reject(error);
      }
    });
    const results = await Promise.all(apiResults);
    const rejectedPromises = results.filter((result) => result instanceof Error);
    if (rejectedPromises.length === results.length) {
      throw new Error(`Error finding every contact: ${rejectedPromises.map((r) => r.message).join(", ")}`);
    }
    return results
      .filter((r) => r !== undefined)
      .map((result) => ({
        id: (result.id as number).toString(),
        name: result.name,
        email: result.emails?.[0] as string,
        ownerId: result.owner?.id?.toString(),
      }));
  }

  private getMeetingBody = (event: CalendarEvent): string => {
    return `<b>${event.organizer.language.translate("invitee_timezone")}:</b> ${
      event.attendees[0].timeZone
    }<br><br><b>${event.organizer.language.translate("share_additional_notes")}</b><br>${
      event.additionalNotes || "-"
    }`;
  };

  async createEvent(event: CalendarEvent, contacts: Contact[]): Promise<NewCalendarEventType> {
    try {
      const activityApi = new ActivitiesApi(await this.getConfig());
      const activity = this.getPipedriveActivityFromCalendarEvent(event, contacts);
      const response = await activityApi.addActivity({ AddActivityRequest: activity });

      if (response.data && response.success) {
        console.debug("event:creation:ok", { response });
        return Promise.resolve(this.getNewCalendarEventFromPipedriveActivity(response.data, contacts));
      }
      console.debug("meeting:creation:notOk", { response, event, contacts });
      throw new Error(JSON.stringify({ response, activity }));
    } catch (error) {
      console.error("Error creating event", { event, contacts, error });
      throw new Error(`Something went wrong when creating a meeting in PipedriveCRM: ${error}`);
    }
  }

  async updateEvent(uid: string, event: CalendarEvent): Promise<NewCalendarEventType> {
    const activityApi = new ActivitiesApi(await this.getConfig());
    const activity = this.getPipedriveActivityFromCalendarEvent(event);

    const response = await activityApi.updateActivity({
      id: Number(uid),
      UpdateActivityRequest: activity,
    });

    if (response.data && response.success) {
      console.debug("event:update:ok", { response });
      return Promise.resolve(this.getNewCalendarEventFromPipedriveActivity(response.data));
    }
    console.debug("meeting:updation:notOk", { response, event });
    throw new Error(`Something went wrong updating a meeting in PipedriveCRM: ${response}`);
  }

  async deleteEvent(uid: string): Promise<void> {
    const activityApi = new ActivitiesApi(await this.getConfig());
    const response = await activityApi.deleteActivity({ id: Number(uid) });
    if (response.data && response.success) {
      console.debug("event:delete:ok", { response });
      return Promise.resolve();
    } else {
      console.debug("meeting:updation:notOk", { response });
      throw new Error(`Something went wrong when deleting a meeting in PipedriveCRM: ${response}`);
    }
  }

  async getAvailability(
    _dateFrom: string,
    _dateTo: string,
    _selectedCalendars: IntegrationCalendar[]
  ): Promise<EventBusyDate[]> {
    return Promise.resolve([]);
  }

  getAppOptions() {
    return {};
  }
}
