import type { CloseComFieldOptions, CloseComLead } from "@calcom/lib/CloseCom";
import CloseCom from "@calcom/lib/CloseCom";
import { getCloseComContactIds, getCloseComLeadId, getCustomFieldsIds } from "@calcom/lib/CloseComeUtils";
import logger from "@calcom/lib/logger";
import type { TeamInfoType } from "@calcom/lib/sync/ISyncService";
import SyncServiceCore from "@calcom/lib/sync/ISyncService";
import type { ConsoleUserInfoType, WebUserInfoType } from "@calcom/lib/sync/ISyncService";
import type ISyncService from "@calcom/lib/sync/ISyncService";
import { MembershipRole } from "@calcom/prisma/enums";

// Cal.com Custom Contact Fields
const calComCustomContactFields: CloseComFieldOptions = [
  // Field name, field type, required?, multiple values?
  ["Username", "text", false, false],
  ["Plan", "text", true, false],
  ["Last booking", "date", false, false],
  ["Created at", "date", true, false],
];

const calComSharedFields: CloseComFieldOptions = [["Contact Role", "text", false, false]];

const serviceName = "closecom_service";

export default class CloseComService extends SyncServiceCore implements ISyncService {
  protected declare service: CloseCom;

  constructor() {
    super(serviceName, CloseCom, logger.getSubLogger({ prefix: [`[[sync] ${serviceName}`] }));
  }

  upsertAnyUser = async (
    user: WebUserInfoType | ConsoleUserInfoType,
    leadInfo?: CloseComLead,
    role?: string
  ) => {
    this.log.debug("sync:closecom:user", { user });
    // Get Cal.com Lead
    const leadId = await getCloseComLeadId(this.service, leadInfo);
    this.log.debug("sync:closecom:user:leadId", { leadId });
    // Get Contacts ids: already creates contacts
    const [contactId] = await getCloseComContactIds([user], this.service, leadId);
    this.log.debug("sync:closecom:user:contactsIds", { contactId });
    // Get Custom Contact fields ids
    const customFieldsIds = await getCustomFieldsIds("contact", calComCustomContactFields, this.service);
    this.log.debug("sync:closecom:user:customFieldsIds", { customFieldsIds });
    // Get shared fields ids
    const sharedFieldsIds = await getCustomFieldsIds("shared", calComSharedFields, this.service);
    this.log.debug("sync:closecom:user:sharedFieldsIds", { sharedFieldsIds });
    const allFields = customFieldsIds.concat(sharedFieldsIds);
    this.log.debug("sync:closecom:user:allFields", { allFields });
    const lastBooking = "email" in user ? await this.getUserLastBooking(user) : null;
    this.log.debug("sync:closecom:user:lastBooking", { lastBooking });
    const username = "username" in user ? user.username : null;
    // Prepare values for each Custom Contact Fields
    const allFieldsValues = [
      username, // Username
      user.plan, // Plan
      lastBooking && lastBooking.booking
        ? new Date(lastBooking.booking.createdAt).toLocaleDateString("en-US")
        : null, // Last Booking
      user.createdDate,
      role === MembershipRole.OWNER ? "Point of Contact" : "",
    ];
    this.log.debug("sync:closecom:contact:allFieldsValues", { allFieldsValues });
    // Preparing Custom Activity Instance data for Close.com
    const person = Object.assign(
      {},
      {
        person: user,
        lead_id: leadId,
        contactId,
      },
      ...allFields.map((fieldId: string, index: number) => {
        return {
          [`custom.${fieldId}`]: allFieldsValues[index],
        };
      })
    );
    // Create Custom Activity type instance
    return await this.service.contact.update(person);
  };

  public console = {
    user: {
      upsert: async (consoleUser: ConsoleUserInfoType) => {
        return this.upsertAnyUser(consoleUser);
      },
    },
  };

  public web = {
    user: {
      upsert: async (webUser: WebUserInfoType) => {
        return this.upsertAnyUser(webUser);
      },
      delete: async (webUser: WebUserInfoType) => {
        this.log.debug("sync:closecom:web:user:delete", { webUser });
        const [contactId] = await getCloseComContactIds([webUser], this.service);
        this.log.debug("sync:closecom:web:user:delete:contactId", { contactId });
        if (contactId) {
          return this.service.contact.delete(contactId);
        } else {
          throw Error("Web user not found in service");
        }
      },
    },
    team: {
      create: async (team: TeamInfoType, webUser: WebUserInfoType, role: MembershipRole) => {
        return this.upsertAnyUser(
          webUser,
          {
            companyName: team.name,
          },
          role
        );
      },
      delete: async (team: TeamInfoType) => {
        this.log.debug("sync:closecom:web:team:delete", { team });
        const leadId = await getCloseComLeadId(this.service, { companyName: team.name });
        this.log.debug("sync:closecom:web:team:delete:leadId", { leadId });
        this.service.lead.delete(leadId);
      },
      update: async (prevTeam: TeamInfoType, updatedTeam: TeamInfoType) => {
        this.log.debug("sync:closecom:web:team:update", { prevTeam, updatedTeam });
        const leadId = await getCloseComLeadId(this.service, { companyName: prevTeam.name });
        this.log.debug("sync:closecom:web:team:update:leadId", { leadId });
        this.service.lead.update(leadId, { companyName: updatedTeam.name });
      },
    },
    membership: {
      delete: async (webUser: WebUserInfoType) => {
        this.log.debug("sync:closecom:web:membership:delete", { webUser });
        const [contactId] = await getCloseComContactIds([webUser], this.service);
        this.log.debug("sync:closecom:web:membership:delete:contactId", { contactId });
        if (contactId) {
          return this.service.contact.delete(contactId);
        } else {
          throw Error("Web user not found in service");
        }
      },
    },
  };
}
