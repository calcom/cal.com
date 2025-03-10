import z from "zod";

import Attio from "@calcom/lib/Attio";
import logger from "@calcom/lib/logger";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { CRM, Contact, ContactCreateInput, CrmEvent } from "@calcom/types/CrmService";

// Schema that supports OAuth credentials
const credentialSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number().optional(),
  token_type: z.string(),
});

export default class AttioCRMService implements CRM {
  private integrationName = "attio_crm";
  private log: typeof logger;
  private attio: Attio;
  private appOptions: any;

  constructor(credential: CredentialPayload, appOptions: any) {
    this.log = logger.getSubLogger({ prefix: [`[[lib] ${this.integrationName}`] });
    this.appOptions = appOptions;

    const parsedKey = credentialSchema.safeParse(credential.key);

    if (!parsedKey.success) {
      throw new Error(
        `Invalid credentials for userId ${credential.userId} and appId ${credential.appId}: ${parsedKey.error}`
      );
    }

    this.attio = new Attio(parsedKey.data.access_token);
  }

  async createEvent(event: CalendarEvent, contacts: Contact[]): Promise<CrmEvent> {
    try {
      const contactEmails = contacts.map((contact) => contact.email);
      const contactDetails = await this.getContacts({ emails: contactEmails });

      const userDetails = await this.attio.user.getSelf();

      // Extract record IDs from valid contacts only
      const linkedRecords = contactDetails
        .map((contact) => {
          const [_, recordId] = contact.id.split(":");
          if (!recordId) {
            return null;
          }
          return {
            target_object: "people",
            target_record_id: recordId,
          };
        })
        .filter((record): record is { target_object: string; target_record_id: string } => record !== null);

      // Create a single task linked to all contacts
      const taskResponse = await this.attio.task.create({
        format: "plaintext",
        is_completed: false,
        linked_records: linkedRecords,
        assignees: [
          {
            referenced_actor_type: "workspace-member",
            referenced_actor_id: userDetails.authorized_by_workspace_member_id,
          },
        ],
        content: `${event.title}\n\nDescription: ${event.description || ""}\nOrganizer: ${
          event.organizer.name
        } (${event.organizer.email})`,
        deadline_at: event.startTime,
      });

      const createdEvent = {
        id: taskResponse.data.id.task_id,
        uid: `${taskResponse.data.id.workspace_id}:${taskResponse.data.id.task_id}`,
        type: this.integrationName,
        url: "",
        additionalInfo: { contacts, taskResponse },
        password: "",
      };

      this.log.debug("Created Attio event", { event: createdEvent });
      return createdEvent;
    } catch (error) {
      this.log.error("Error creating event in Attio", error);
      throw error;
    }
  }

  async updateEvent(uid: string, event: CalendarEvent): Promise<CrmEvent> {
    try {
      const response = await this.attio.task.update(uid, {
        deadline_at: event.startTime,
      });

      const updatedEvent = {
        id: response.data.id.task_id,
        uid: `${response.data.id.workspace_id}:${response.data.id.task_id}`,
        type: this.integrationName,
        url: "",
        additionalInfo: { response },
        password: "",
      };

      this.log.debug("Updated Attio event", { event: updatedEvent });
      return updatedEvent;
    } catch (error) {
      this.log.error("Error updating event in Attio", { error, uid, event });
      throw error;
    }
  }

  async deleteEvent(uid: string): Promise<void> {
    try {
      await this.attio.task.delete(uid);
      this.log.debug("Successfully deleted Attio event", { uid });
    } catch (error) {
      this.log.error("Error deleting event in Attio", { error, uid });
      throw error;
    }
  }

  async getContacts({ emails }: { emails: string | string[] }): Promise<Contact[]> {
    try {
      const emailArray = Array.isArray(emails) ? emails : [emails];
      const response = await this.attio.contact.search({ emails: emailArray });

      return response.data.map((record) => {
        const activeEmail = record.values.email_addresses.find(
          (email) => email.active_until === null
        )?.email_address;
        if (!activeEmail) {
          throw new Error(`No active email address found for record ${record.id.record_id}`);
        }
        return {
          id: `${record.id.workspace_id}:${record.id.record_id}`,
          email: activeEmail,
        };
      });
    } catch (error) {
      this.log.error("Error getting contacts from Attio", error);
      throw error;
    }
  }

  async createContacts(contactsToCreate: ContactCreateInput[]): Promise<Contact[]> {
    try {
      const response = await this.attio.contact.create({
        values: {
          email_addresses: contactsToCreate.map((contact) => ({
            email_address: contact.email,
          })),
          name: contactsToCreate.map((contact) => ({
            first_name: contact.name,
            last_name: " ",
            full_name: contact.name,
          })),
        },
      });

      const activeEmail = response.data.values.email_addresses.find(
        (email) => email.active_until === null
      )?.email_address;
      if (!activeEmail) {
        throw new Error(`No active email address found for record ${response.data.id.record_id}`);
      }
      return [
        {
          id: `${response.data.id.workspace_id}:${response.data.id.record_id}`,
          email: activeEmail,
        },
      ];
    } catch (error) {
      this.log.error("Error creating contacts in Attio", error);
      throw error;
    }
  }

  public getAppOptions() {
    return this.appOptions;
  }
}
