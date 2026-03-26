import z from "zod";

import type { CloseComFieldOptions } from "@calcom/lib/CloseCom";
import CloseCom from "@calcom/lib/CloseCom";
import { getCustomActivityTypeInstanceData } from "@calcom/lib/CloseComeUtils";
import { symmetricDecrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { CRM, ContactCreateInput, CrmEvent, Contact } from "@calcom/types/CrmService";

// Schema that supports both OAuth and API key credentials
const credentialSchema = z
  .object({
    encrypted: z.string().optional(),
    access_token: z.string().optional(),
    refresh_token: z.string().optional(),
    expires_at: z.number().optional(),
  })
  .refine(
    (data) => {
      // Either encrypted (API key) or access_token (OAuth) must be present
      return !!data.encrypted || !!data.access_token;
    },
    {
      message: "Either API key or OAuth credentials must be provided",
    }
  );

const CALENDSO_ENCRYPTION_KEY = process.env.CALENDSO_ENCRYPTION_KEY || "";

// Cal.com Custom Activity Fields
const calComCustomActivityFields: CloseComFieldOptions = [
  // Field name, field type, required?, multiple values?
  ["Attendees", "contact", false, true],
  ["Date & Time", "datetime", true, false],
  ["Time zone", "text", true, false],
  ["Organizer", "contact", true, false],
  ["Additional notes", "text", false, false],
];

/**
 * Authentication
 * Close.com provides OAuth for authentication.
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
class CloseComCRMService implements CRM {
  private integrationName = "";
  private closeCom: CloseCom;
  private log: typeof logger;

  constructor(credential: CredentialPayload) {
    this.integrationName = "closecom_other_calendar";
    this.log = logger.getSubLogger({ prefix: [`[[lib] ${this.integrationName}`] });

    const parsedKey = credentialSchema.safeParse(credential.key);

    if (!parsedKey.success) {
      throw new Error(
        `Invalid credentials for userId ${credential.userId} and appId ${credential.appId}: ${parsedKey.error}`
      );
    }

    // Initialize CloseCom client based on credential type
    if (parsedKey.data.encrypted) {
      // API key authentication
      const decrypted = symmetricDecrypt(parsedKey.data.encrypted, CALENDSO_ENCRYPTION_KEY);
      const { api_key } = JSON.parse(decrypted);
      this.closeCom = new CloseCom(api_key);
    } else if (parsedKey.data.access_token) {
      // OAuth authentication
      this.closeCom = new CloseCom(parsedKey.data.access_token, {
        refresh_token: parsedKey.data.refresh_token,
        expires_at: parsedKey.data.expires_at,
        isOAuth: true,
        userId: credential.userId!,
      });
    } else {
      throw new Error("No valid authentication method found");
    }
  }

  closeComUpdateCustomActivity = async (uid: string, event: CalendarEvent) => {
    const customActivityTypeInstanceData = await getCustomActivityTypeInstanceData(
      event,
      calComCustomActivityFields,
      this.closeCom
    );
    // Create Custom Activity type instance
    const customActivityTypeInstance = await this.closeCom.activity.custom.create(
      customActivityTypeInstanceData
    );
    return this.closeCom.activity.custom.update(uid, customActivityTypeInstance);
  };

  closeComDeleteCustomActivity = async (uid: string) => {
    return this.closeCom.activity.custom.delete(uid);
  };

  async createEvent(event: CalendarEvent): Promise<CrmEvent> {
    const customActivityTypeInstanceData = await getCustomActivityTypeInstanceData(
      event,
      calComCustomActivityFields,
      this.closeCom
    );
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
      success: true,
    });
  }

  async updateEvent(uid: string, event: CalendarEvent): Promise<CrmEvent> {
    const updatedEvent = await this.closeComUpdateCustomActivity(uid, event);
    return {
      id: updatedEvent.id,
    };
  }

  async deleteEvent(uid: string): Promise<void> {
    await this.closeComDeleteCustomActivity(uid);
  }

  async getContacts({ emails }: { emails: string | string[] }): Promise<Contact[]> {
    const contactsQuery = await this.closeCom.contact.search({
      emails: Array.isArray(emails) ? emails : [emails],
    });

    return contactsQuery.data.map((contact) => {
      return {
        id: contact.id,
        email: contact.emails[0].email,
        name: contact.name,
      };
    });
  }

  async createContacts(contactsToCreate: ContactCreateInput[]): Promise<Contact[]> {
    // In Close.com contacts need to be attached to a lead
    // Assume all attendees in an event belong under a lead

    const contacts = [];

    // Create main lead
    const lead = await this.closeCom.lead.create({
      contactName: contactsToCreate[0].name,
      contactEmail: contactsToCreate[0].email,
    });

    contacts.push({
      id: lead.contacts[0].id,
      email: lead.contacts[0].emails[0].email,
    });

    // Check if we need to crate more contacts under the lead
    if (contactsToCreate.length > 1) {
      const createContactPromise = [];
      for (const contact of contactsToCreate) {
        createContactPromise.push(
          this.closeCom.contact.create({
            leadId: lead.id,
            person: {
              email: contact.email,
              name: contact.name,
            },
          })
        );
        const createdContacts = await Promise.all(createContactPromise);
        for (const createdContact of createdContacts) {
          contacts.push({
            id: createdContact.id,
            email: createdContact.emails[0].email,
          });
        }
      }
    }

    return contacts;
  }

  getAppOptions() {
    console.log("No options implemented");
  }

  async handleAttendeeNoShow() {
    console.log("Not implemented");
  }
}

/**
 * Factory function that creates a Close.com CRM service instance.
 * This is exported instead of the class to prevent internal types
 * from leaking into the emitted .d.ts file.
 */
export default function BuildCrmService(
  credential: CredentialPayload,
  _appOptions?: Record<string, unknown>
): CRM {
  return new CloseComCRMService(credential);
}
