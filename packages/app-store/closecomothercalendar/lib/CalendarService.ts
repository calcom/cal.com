import { Credential } from "@prisma/client";
import z from "zod";

import CloseCom, { CloseComCustomActivityCreate } from "@calcom/lib/CloseCom";
import { symmetricDecrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import type {
  Calendar,
  CalendarEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";

const apiKeySchema = z.object({
  encrypted: z.string(),
});

const CALENDSO_ENCRYPTION_KEY = process.env.CALENDSO_ENCRYPTION_KEY || "";

// Cal.com Custom Activity Fields
const calComCustomActivityFields: [string, string, boolean, boolean][] = [
  // Field name, field type, required?, multiple values?
  ["Attendees", "contact", false, true],
  ["Date & Time", "datetime", true, false],
  ["Time zone", "text", true, false],
  ["Organizer", "contact", true, false],
  ["Additional notes", "text", false, false],
];

/**
 * Authentication
 * Close.com requires Basic Auth for any request to their APIs, which is far from
 * ideal considering that such a strategy requires generating an API Key by the
 * user and input it in our system. A Setup page was created when trying to install
 * Close.com App in order to instruct how to create such resource and to obtain it.
 *
 * Meeting creation
 * Close.com does not expose a "Meeting" API, it may be available in the future.
 *
 * Per Close.com documentation (https://developer.close.com/resources/custom-activities):
 * "To work with Custom Activities, you will need to create a Custom Activity Type and
 * likely add one or more Activity Custom Fields to that type. Once the Custom Activity
 * Type is defined, you can create Custom Activity instances of that type as you would
 * any other activity."
 *
 * Contact creation
 * Every contact in Close.com need to belong to a Lead. When creating a contact in
 * Close.com as part of this integration, a new generic Lead will be created in order
 * to assign every contact created by this process, and it is named "From Cal.com"
 */
export default class CloseComCalendarService implements Calendar {
  private integrationName = "";
  private closeCom: CloseCom;
  private log: typeof logger;

  constructor(credential: Credential) {
    this.integrationName = "closecom_other_calendar";
    this.log = logger.getChildLogger({ prefix: [`[[lib] ${this.integrationName}`] });

    const parsedCredentialKey = apiKeySchema.safeParse(credential.key);

    let decrypted;
    if (parsedCredentialKey.success) {
      decrypted = symmetricDecrypt(parsedCredentialKey.data.encrypted, CALENDSO_ENCRYPTION_KEY);
      const { api_key } = JSON.parse(decrypted);
      this.closeCom = new CloseCom(api_key);
    } else {
      throw Error(
        `No API Key found for userId ${credential.userId} and appId ${credential.appId}: ${parsedCredentialKey.error}`
      );
    }
  }

  private async closeComUpdateCustomActivity(uid: string, event: CalendarEvent) {
    const customActivityTypeInstanceData = await this.getCustomActivityTypeInstanceData(event);
    // Create Custom Activity type instance
    const customActivityTypeInstance = await this.closeCom.activity.custom.create(
      customActivityTypeInstanceData
    );
    return this.closeCom.activity.custom.update(uid, customActivityTypeInstance);
  }

  private async closeComDeleteCustomActivity(uid: string) {
    return this.closeCom.activity.custom.delete(uid);
  }

  getCloseComContactIds = async (event: CalendarEvent, leadFromCalComId: string) => {
    // Check if attendees exist or to see if any should be created
    const closeComContacts = await this.closeCom.contact.search({
      emails: event.attendees.map((att) => att.email),
    });
    // NOTE: If contact is duplicated in Close.com we will get more results
    //       messing around with the expected number of contacts retrieved
    if (closeComContacts.data.length < event.attendees.length) {
      // Create missing contacts
      const attendeesEmails = event.attendees.map((att) => att.email);
      // Existing contacts based on attendees emails: contacts may have more
      // than one email, we just need the one used by the event.
      const existingContactsEmails = closeComContacts.data.flatMap((cont) =>
        cont.emails.filter((em) => attendeesEmails.includes(em.email)).map((ems) => ems.email)
      );
      const nonExistingContacts = event.attendees.filter(
        (attendee) => !existingContactsEmails.includes(attendee.email)
      );
      const createdContacts = await Promise.all(
        nonExistingContacts.map(
          async (att) =>
            await this.closeCom.contact.create({
              attendee: att,
              leadId: leadFromCalComId,
            })
        )
      );
      if (createdContacts.length === nonExistingContacts.length) {
        // All non existent contacts where created
        return closeComContacts.data.map((cont) => cont.id).concat(createdContacts.map((cont) => cont.id));
      } else {
        return Promise.reject("Some contacts were not possible to create in Close.com");
      }
    } else {
      return closeComContacts.data.map((cont) => cont.id);
    }
  };

  /**
   * Check if generic "From Cal.com" Lead exists, create it if not
   */
  getCloseComGenericLeadId = async (): Promise<string> => {
    const closeComLeadNames = await this.closeCom.lead.list({ query: { _fields: ["name", "id"] } });
    const searchLeadFromCalCom = closeComLeadNames.data.filter((lead) => lead.name === "From Cal.com");
    if (searchLeadFromCalCom.length === 0) {
      // No Lead exists, create it
      const createdLeadFromCalCom = await this.closeCom.lead.create({
        companyName: "From Cal.com",
        description: "Generic Lead for Contacts created by Cal.com",
      });
      return createdLeadFromCalCom.id;
    } else {
      return searchLeadFromCalCom[0].id;
    }
  };

  getCloseComCustomActivityTypeFieldsIds = async () => {
    // Check if Custom Activity Type exists
    const customActivities = await this.closeCom.customActivity.type.get();
    const calComCustomActivity = customActivities.data.filter((act) => act.name === "Cal.com Activity");
    if (calComCustomActivity.length > 0) {
      // Cal.com Custom Activity type exist
      // Get Custom Activity Fields
      const customActivityAllFields = await this.closeCom.customField.activity.get({
        query: { _fields: ["name", "custom_activity_type_id", "id"] },
      });
      const customActivityRelevantFields = customActivityAllFields.data.filter(
        (fie) => fie.custom_activity_type_id === calComCustomActivity[0].id
      );
      const customActivityFieldsNames = customActivityRelevantFields.map((fie) => fie.name);
      const customActivityFieldsExist = calComCustomActivityFields.map((cusFie) =>
        customActivityFieldsNames.includes(cusFie[0])
      );
      const [attendee, dateTime, timezone, organizer, additionalNotes] = await Promise.all(
        customActivityFieldsExist.map(async (exist, idx) => {
          if (!exist) {
            const [name, type, required, multiple] = calComCustomActivityFields[idx];
            const created = await this.closeCom.customField.activity.create({
              custom_activity_type_id: calComCustomActivity[0].id,
              name,
              type,
              required,
              accepts_multiple_values: multiple,
              editable_with_roles: [],
            });
            return created.id;
          } else {
            const index = customActivityFieldsNames.findIndex(
              (val) => val === calComCustomActivityFields[idx][0]
            );
            if (index >= 0) {
              return customActivityRelevantFields[index].id;
            } else {
              throw Error("Couldn't find the field index");
            }
          }
        })
      );
      return {
        activityType: calComCustomActivity[0].id,
        fields: {
          attendee,
          dateTime,
          timezone,
          organizer,
          additionalNotes,
        },
      };
    } else {
      // Cal.com Custom Activity type doesn't exist
      // Create Custom Activity Type
      const { id: activityType } = await this.closeCom.customActivity.type.create({
        name: "Cal.com Activity",
        description: "Bookings in your Cal.com account",
      });
      // Create Custom Activity Fields
      const [attendee, dateTime, timezone, organizer, additionalNotes] = await Promise.all(
        calComCustomActivityFields.map(async ([name, type, required, multiple]) => {
          const creation = await this.closeCom.customField.activity.create({
            custom_activity_type_id: activityType,
            name,
            type,
            required,
            accepts_multiple_values: multiple,
            editable_with_roles: [],
          });
          return creation.id;
        })
      );
      return {
        activityType,
        fields: {
          attendee,
          dateTime,
          timezone,
          organizer,
          additionalNotes,
        },
      };
    }
  };

  getCustomActivityTypeInstanceData = async (event: CalendarEvent): Promise<CloseComCustomActivityCreate> => {
    // Get Cal.com generic Lead
    const leadFromCalComId = await this.getCloseComGenericLeadId();
    // Get Contacts ids
    const contactsIds = await this.getCloseComContactIds(event, leadFromCalComId);
    // Get Custom Activity Type id
    const customActivityTypeAndFieldsIds = await this.getCloseComCustomActivityTypeFieldsIds();
    // Prepare values for each Custom Activity Fields
    const customActivityFieldsValue = {
      attendee: contactsIds.length > 1 ? contactsIds.slice(1) : null,
      dateTime: event.startTime,
      timezone: event.attendees[0].timeZone,
      organizer: contactsIds[0],
      additionalNotes: event.additionalNotes ?? null,
    };
    // Preparing Custom Activity Instance data for Close.com
    return Object.assign(
      {},
      {
        custom_activity_type_id: customActivityTypeAndFieldsIds.activityType,
        lead_id: leadFromCalComId,
      }, // This is to add each field as "custom.FIELD_ID": "value" in the object
      ...Object.keys(customActivityTypeAndFieldsIds.fields).map((fieldKey: string) => {
        const key = fieldKey as keyof typeof customActivityTypeAndFieldsIds.fields;
        return {
          [`custom.${customActivityTypeAndFieldsIds.fields[key]}`]: customActivityFieldsValue[key],
        };
      })
    );
  };

  async createEvent(event: CalendarEvent): Promise<NewCalendarEventType> {
    const customActivityTypeInstanceData = await this.getCustomActivityTypeInstanceData(event);
    // Create Custom Activity type instance
    const customActivityTypeInstance = await this.closeCom.activity.custom.create(
      customActivityTypeInstanceData
    );
    return Promise.resolve({
      uid: customActivityTypeInstance.id,
      id: customActivityTypeInstance.id,
      type: this.integrationName,
      password: "",
      url: "",
      additionalInfo: {
        customActivityTypeInstanceData,
      },
    });
  }

  async updateEvent(uid: string, event: CalendarEvent): Promise<any> {
    return await this.closeComUpdateCustomActivity(uid, event);
  }

  async deleteEvent(uid: string): Promise<void> {
    return await this.closeComDeleteCustomActivity(uid);
  }

  async getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[]
  ): Promise<EventBusyDate[]> {
    return Promise.resolve([]);
  }

  async listCalendars(event?: CalendarEvent): Promise<IntegrationCalendar[]> {
    return Promise.resolve([]);
  }
}
