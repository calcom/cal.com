import CloseCom from "@calcom/lib/CloseCom";
import {
  getCloseComContactIds,
  getCloseComGenericLeadId,
  getCustomFieldsIds,
} from "@calcom/lib/CloseComeUtils";
import logger from "@calcom/lib/logger";
import SyncServiceCore from "@calcom/lib/sync/ISyncService";
import ISyncService, { ConsoleUserInfoType, WebUserInfoType } from "@calcom/lib/sync/ISyncService";

// Cal.com Custom Contact Fields
const calComCustomContactFields: [string, string, boolean, boolean][] = [
  // Field name, field type, required?, multiple values?
  ["Username", "text", false, false],
  ["Plan", "text", true, false],
  ["Last booking", "date", false, false],
];

const serviceName = "closecom_service";

export default class CloseComService extends SyncServiceCore implements ISyncService {
  constructor() {
    super(serviceName, new CloseCom(), logger.getChildLogger({ prefix: [`[[sync] ${serviceName}`] }));
  }

  upsertAnyUser = async (user: WebUserInfoType | ConsoleUserInfoType) => {
    this.log.debug("sync:closecom:user", user);
    // Get Cal.com generic Lead
    const leadId = await getCloseComGenericLeadId(this.service);
    this.log.debug("sync:closecom:user:leadId", leadId);
    // Get Contacts ids: already creates contacts
    const [contactId] = await getCloseComContactIds([user], leadId, this.service);
    this.log.debug("sync:closecom:user:contactsIds", contactId);
    // Get Custom Contact fields ids
    const customFieldsIds = await getCustomFieldsIds("contact", calComCustomContactFields, this.service);
    this.log.debug("sync:closecom:user:customFieldsIds", customFieldsIds);
    const lastBooking = "email" in user ? await this.getUserLastBooking(user) : null;
    this.log.debug("sync:closecom:user:lastBooking", lastBooking);
    const username = "username" in user ? user.username : null;
    // Prepare values for each Custom Contact Fields
    const customContactFieldsValues = [
      username, // Username
      user.plan, // Plan
      lastBooking && lastBooking.booking
        ? new Date(lastBooking.booking.createdAt).toLocaleDateString("en-US")
        : null, // Last Booking
    ];
    this.log.debug("sync:closecom:contact:customContactFieldsValues", customContactFieldsValues);
    // Preparing Custom Activity Instance data for Close.com
    const person = Object.assign(
      {},
      {
        person: user,
        lead_id: leadId,
        contactId,
      },
      ...customFieldsIds.map((fieldId: string, index: number) => {
        return {
          [`custom.${fieldId}`]: customContactFieldsValues[index],
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
    },
  };
}
