import axios from "axios";
import qs from "qs";

import { getLocation } from "@calcom/lib/CalEventParser";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type {
  CalendarEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { ContactCreateInput, CRM, Contact } from "@calcom/types/CrmService";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import refreshOAuthTokens from "../../_utils/oauth/refreshOAuthTokens";
import appConfig from "../config.json";

export type PipedriveToken = {
  scope: string;
  api_domain: string;
  expires_in: number;
  expiryDate: number;
  token_type: string;
  access_token: string;
  accountServer: string;
  refresh_token: string;
};

export interface PipedrivePagination {
  additional_data: {
    pagination: {
      start: number;
      limit: number;
      next_start: number;
      more_items_in_collection: boolean;
    };
  };
}

//TODO: move this some other file.
export interface PipedriveEvent {
  id: string;
  company_id: string;
  user_id: string;
  done: boolean;
  type: string;
  reference_type: string;
  reference_id: string;
  conference_meeting_client: string;
  conference_meeting_url: string;
  conference_meeting_id: string;
  due_date: string;
  due_time: string;
  duration: string;
  busy_flag: boolean;
  add_time: string;
  marked_as_done_time: string;
  last_notification_time: Date;
  last_notification_user_id: string;
  notification_language_id: string;
  subject: string;
  public_description: string;
  calendar_sync_include_context: string;
  location: string;
  org_id: string;
  person_id: string;
  deal_id: string;
  lead_id: string;
  project_id: string;
  active_flag: boolean;
  update_time: Date;
  update_user_id: string;
  gcal_event_id: string;
  google_calendar_id: string;
  google_calendar_etag: string;
  source_timezone: string;
  rec_rule: string;
  rec_rule_extension: string;
  rec_master_activity_id: string;
  series: any[];
  note: string;
  created_by_user_id: string;
  location_subpremise: string;
  location_street_number: string;
  location_route: string;
  location_sublocality: string;
  location_locality: string;
  location_admin_area_level_1: string;
  location_admin_area_level_2: string;
  location_country: string;
  location_postal_code: string;
  location_formatted_address: string;
  attendees: {
    email_address: string;
    is_organizer: any;
    name: string;
    person_id: string;
    status: string;
    user_id: string;
  }[];
  participants: { person_id: string; primary_flag: boolean }[];
  org_name: string;
  person_name: string;
  deal_title: string;
  owner_name: string;
  person_dropbox_bcc: string;
  deal_dropbox_bcc: string;
  assigned_to_user_id: string;
  file: {
    id: string;
    clean_name: string;
    url: string;
  };
}

export interface PipedriveContact {
  id: string;
  company_id: number;
  owner_id: {
    id: number;
    name: string;
    email: string;
    has_pic: number;
    pic_hash: string;
    active_flag: boolean;
    value: number;
  };
  org_id: {
    name: string;
    people_count: number;
    owner_id: number;
    address: string;
    active_flag: boolean;
    cc_email: string;
    value: number;
  };
  name: string;
  first_name: string;
  last_name: string;
  open_deals_count: number;
  related_open_deals_count: number;
  closed_deals_count: number;
  related_closed_deals_count: number;
  participant_open_deals_count: number;
  participant_closed_deals_count: number;
  email_messages_count: number;
  activities_count: number;
  done_activities_count: number;
  undone_activities_count: number;
  files_count: number;
  notes_count: number;
  followers_count: number;
  won_deals_count: number;
  related_won_deals_count: number;
  lost_deals_count: number;
  related_lost_deals_count: number;
  active_flag: boolean;
  phone: { value: string; primary: boolean; label: string }[];
  email: { value: string; primary: boolean; label: string }[];
  primary_email: string;
  first_char: string;
  update_time: Date;
  add_time: Date;
  visible_to: string;
  marketing_status: string;
  picture_id: {
    item_type: string;
    item_id: number;
    active_flag: boolean;
    add_time: string;
    update_time: string;
    added_by_user_id: number;
    pictures: {
      "128": string;
      "512": string;
    };
    value: number;
  };
  next_activity_date: string;
  next_activity_time: string;
  next_activity_id: number;
  last_activity_id: number;
  last_activity_date: string;
  last_incoming_mail_time: string;
  last_outgoing_mail_time: string;
  label: number;
  org_name: string;
  owner_name: string;
  cc_email: string;
}

type ContactSearchResult = {
  status: string;
  results: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    name: string;
  }>;
};

type ContactCreateResult = {
  status: string;
  result: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    name: string;
  };
};

const baseUrl = "https://api.pipedrive.com";

export default class PipedriveCrmService implements CRM {
  private integrationName = "";
  private auth: Promise<{ getToken: () => Promise<void> }>;
  private log: typeof logger;
  private client_id = "";
  private client_secret = "";
  private accessToken = "";
  constructor(credential: CredentialPayload) {
    this.log = logger.getSubLogger({ prefix: [`[[lib] ${appConfig.slug}`] });
    this.integrationName = "pipedrive-crm_crm";
    this.auth = this.pipedriveCrmAuth(credential).then((r) => r);
  }
  private pipedriveCrmAuth = async (credential: CredentialPayload) => {
    const appKeys = await getAppKeysFromSlug("pipedrive-crm");
    if (typeof appKeys.client_id === "string") this.client_id = appKeys.client_id;
    if (typeof appKeys.client_secret === "string") this.client_secret = appKeys.client_secret;
    if (!this.client_id)
      throw new HttpError({ statusCode: 400, message: "Pipedrive CRM client_id missing." });
    if (!this.client_secret)
      throw new HttpError({ statusCode: 400, message: "Pipedrive CRM client_secret missing." });
    const credentialKey = credential.key as unknown as PipedriveToken;
    const accountServer = credentialKey.accountServer || "https://oauth.pipedrive.com";
    const isTokenValid = (token: PipedriveToken) => {
      const isValid = token && token.access_token && token.expiryDate && token.expiryDate > Date.now();
      if (isValid) {
        this.accessToken = token.access_token;
      }
      return isValid;
    };

    const refreshAccessToken = async (credentialKey: PipedriveToken) => {
      try {
        const url = `${accountServer}/oauth/token`;
        const formData = {
          grant_type: "refresh_token",
          client_id: this.client_id,
          client_secret: this.client_secret,
          refresh_token: credentialKey.refresh_token,
        };
        const pipedriveCrmTokenInfo = await refreshOAuthTokens(
          async () =>
            await axios({
              method: "post",
              url: url,
              data: qs.stringify(formData),
              headers: {
                "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
              },
            }),
          appConfig.slug,
          credential.userId
        );
        if (!pipedriveCrmTokenInfo.data.error) {
          // set expiry date as offset from current time.
          pipedriveCrmTokenInfo.data.expiryDate = Math.round(Date.now() + 60 * 60);

          await prisma.credential.update({
            where: {
              id: credential.id,
            },
            data: {
              key: {
                ...(pipedriveCrmTokenInfo.data as PipedriveToken),
                refresh_token: credentialKey.refresh_token,
                accountServer: accountServer,
              },
            },
          });
          this.accessToken = pipedriveCrmTokenInfo.data.access_token;
          this.log.debug("Fetched token", this.accessToken);
        } else {
          this.log.error(pipedriveCrmTokenInfo.data);
        }
      } catch (e: unknown) {
        this.log.error(e);
      }
    };

    return {
      getToken: () => (isTokenValid(credentialKey) ? Promise.resolve() : refreshAccessToken(credentialKey)),
    };
  };
  mapPipedriveObjectCustomFields({ object, objectFields }: { object: any; objectFields: any }) {
    const mappedCustomFields: Record<string, any> = {};
    Object.keys(object).forEach((k) => {
      const a = objectFields.find((p: any) => p.key === k)?.name;
      if (
        a &&
        !Object.keys(object)
          .map((b) => b.toLowerCase())
          .includes(a.toLowerCase())
      ) {
        mappedCustomFields[a] = object?.[k];
      }
    });
    return {
      ...object,
      ...mappedCustomFields,
    };
  }

  //TO DO: we can move this to some utils
  convertToHHMMInUTC(dateTimeString: string) {
    const date = new Date(dateTimeString);

    // Get hours and minutes in UTC format
    const hoursUTC = date.getUTCHours().toString().padStart(2, "0");
    const minutesUTC = date.getUTCMinutes().toString().padStart(2, "0");

    // Format the time as "HH:MM"
    const formattedTimeUTC = `${hoursUTC}:${minutesUTC}`;

    return formattedTimeUTC;
  }

  //TO DO: we can move this to some utils
  getFormattedDate(inputDate: string) {
    const dateObj = new Date(inputDate);

    // Extract year, month, and day
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0"); // Adding 1 because months are zero-indexed
    const day = String(dateObj.getDate()).padStart(2, "0");

    // Format the date as "YYYY-MM-DD"
    const formattedDate = `${year}-${month}-${day}`;

    return formattedDate;
  }

  //TO DO: we can move this to some utils
  getDuration(startDateTime: string, endDateTime: string) {
    const startDate = new Date(startDateTime).getTime();
    const endDate = new Date(endDateTime).getTime();

    // Calculate the absolute difference in milliseconds
    const durationMs = Math.abs(endDate - startDate);

    // Convert milliseconds to hours and minutes
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    // Format the duration as "HH:MM"
    const formattedDuration = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

    return formattedDuration;
  }

  async createContacts(contactsToCreate: ContactCreateInput[]): Promise<Contact[]> {
    const auth = await this.auth;
    await auth.getToken();
    const result = contactsToCreate.map(async (attendee) => {
      const [firstname, lastname] = !!attendee.name ? attendee.name.split(" ") : [attendee.email, "-"];
      const body = {
        firstName: firstname,
        lastName: lastname || "-",
        email: attendee.email,
      };

      try {
        const contactCreated = await axios.post<{ data: Partial<PipedriveContact> }>(
          `${baseUrl}/v1/persons`,
          body,
          {
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
            },
          }
        );
        return {
          status: "ok",
          message: "Pipedrive contact created",
          result: {
            ...contactCreated.data.data,
          },
        } as unknown as ContactCreateResult;
      } catch (error) {
        return Promise.reject(error);
      }
    });

    const results = await Promise.all(result);
    return results.map((result) => result.result);
  }

  async getContacts({ emails }: { emails: string | string[] }): Promise<Contact[]> {
    const emailArray = Array.isArray(emails) ? emails : [emails];
    const auth = await this.auth;
    await auth.getToken();
    const result = emailArray.map(async (attendeeEmail) => {
      try {
        const result = await axios.get<
          { data: { items: { item: any; result_score: number }[] } } & PipedrivePagination
        >(`${baseUrl}/v1/persons/search?term=${attendeeEmail}`, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        });
        const nextCursor = String(result.data?.additional_data?.pagination.next_start) || undefined;
        const prevCursor = undefined;

        const contacts = result.data.data.items.map((item) => item.item);
        const personFields = (
          await axios.get(`${baseUrl}/v1/personFields`, {
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
            },
          })
        ).data.data;
        const mappedContacts = contacts.map((c: any) =>
          this.mapPipedriveObjectCustomFields({ object: c, objectFields: personFields })
        );
        const finalContacts = mappedContacts.map((c: any) => {
          return {
            id: String(c.id),
            email: c.email,
            firstName: c.first_name,
            lastName: c.last_name,
            name: `${c.first_name} ${c.last_name}`,
          };
        });
        return {
          status: "ok",
          results: finalContacts,
          nextCursor,
          prevCursor,
        } as unknown as ContactSearchResult;
      } catch (error) {
        return { status: "error", results: [] };
      }
    });
    const results = await Promise.all(result);
    //not sure about this. this will give use first api repsone results.
    return results[0].results;
  }

  private getMeetingBody = (event: CalendarEvent): string => {
    return `<b>${event.organizer.language.translate("invitee_timezone")}:</b> ${
      event.attendees[0].timeZone
    }<br><br><b>${event.organizer.language.translate("share_additional_notes")}</b><br>${
      event.additionalNotes || "-"
    }`;
  };

  private createPipedriveEvent = async (event: CalendarEvent, contacts: Contact[]) => {
    const eventPayload = {
      subject: event.title,
      due_time: this.convertToHHMMInUTC(event.startTime),
      due_date: this.getFormattedDate(event.startTime),
      duration: this.getDuration(event.startTime, event.endTime),
      public_description: this.getMeetingBody(event),
      location: getLocation(event),
      person_id: String(contacts[0].id),
    };
    const auth = await this.auth;
    await auth.getToken();
    const eventCreated = await axios.post<{ data: Partial<PipedriveEvent> }>(
      `${baseUrl}/v1/activities`,
      eventPayload,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    return {
      status: "ok",
      message: "Pipedrive event created",
      result: {
        ...eventCreated.data.data,
      },
    };
  };

  private updateMeeting = async (uid: string, event: CalendarEvent) => {
    const eventPayload = {
      subject: event.title,
      due_time: this.convertToHHMMInUTC(event.startTime),
      due_date: this.getFormattedDate(event.startTime),
      duration: this.getDuration(event.startTime, event.endTime),
      public_description: this.getMeetingBody(event),
      location: getLocation(event),
    };
    const auth = await this.auth;
    await auth.getToken();
    const eventUpdated = await axios.put<{ data: Partial<PipedriveEvent> }>(
      `${baseUrl}/v1/activities/${uid}`,
      eventPayload,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );
    return {
      status: "ok",
      message: "Pipedrive event updated",
      result: {
        ...eventUpdated.data.data,
      },
    };
  };

  private deleteMeeting = async (uid: string) => {
    try {
      const auth = await this.auth;
      await auth.getToken();
      await axios.delete<{ data: Partial<PipedriveEvent> } & PipedrivePagination>(
        `${baseUrl}/v1/activities/${uid}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );
      return { status: "ok", message: "deleted" };
    } catch (e) {
      return { status: "error", message: "error" };
    }
  };

  async handleEventCreation(event: CalendarEvent, contacts: Contact[]) {
    const meetingEvent = await this.createPipedriveEvent(event, contacts);
    if (meetingEvent && meetingEvent.status === "ok") {
      this.log.debug("event:creation:ok", { meetingEvent });
      return Promise.resolve({
        uid: meetingEvent.result.id,
        id: meetingEvent.result.id,
        type: appConfig.slug,
        password: "",
        url: "",
        additionalInfo: { contacts, meetingEvent },
      } as NewCalendarEventType);
    }
    this.log.debug("meeting:creation:notOk", { meetingEvent, event, contacts });
    return Promise.reject("Something went wrong when creating a meeting in PipedriveCRM");
  }

  async createEvent(event: CalendarEvent, contacts: Contact[]): Promise<NewCalendarEventType> {
    return await this.handleEventCreation(event, contacts);
  }

  async updateEvent(uid: string, event: CalendarEvent): Promise<NewCalendarEventType> {
    const meetingEvent = await this.updateMeeting(uid, event);
    if (meetingEvent && meetingEvent.status === "ok") {
      this.log.debug("event:updation:ok", { meetingEvent });
      return Promise.resolve({
        uid: meetingEvent.result.id,
        id: meetingEvent.result.id,
        type: appConfig.slug,
        password: "",
        url: "",
        additionalInfo: { meetingEvent },
      } as NewCalendarEventType);
    }
    this.log.debug("meeting:updation:notOk", { meetingEvent, event });
    return Promise.reject("Something went wrong when updating a meeting in PipedriveCRM");
  }

  async deleteEvent(uid: string): Promise<void> {
    await this.deleteMeeting(uid);
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
}
