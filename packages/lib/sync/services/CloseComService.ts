import CloseCom from "@calcom/lib/CloseCom";
import {
  getCloseComContactIds,
  getCloseComGenericLeadId,
  getCustomFieldsIds,
} from "@calcom/lib/CloseComeUtils";
import logger from "@calcom/lib/logger";
import ISyncService, { ConsoleUserInfoType, WebUserInfoType } from "@calcom/lib/sync/ISyncService";
import { default as webPrisma } from "@calcom/prisma";

// Cal.com Custom Contact Fields
const calComCustomContactFields: [string, string, boolean, boolean][] = [
  // Field name, field type, required?, multiple values?
  ["Username", "text", true, false],
  ["Plan", "text", true, false],
  ["Last booking", "datetime", false, false],
];

export default class CloseComService implements ISyncService {
  private serviceName: string;
  private closeCom: CloseCom;
  private log: typeof logger;

  constructor() {
    this.serviceName = "closecom_service";
    this.closeCom = new CloseCom();
    this.log = logger.getChildLogger({ prefix: [`[[sync] ${this.serviceName}`] });
  }

  async getUserLastBooking(user: { id: number }) {
    return await webPrisma.booking.findFirst({
      where: { id: user.id },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  upsertAnyUser = async (user: WebUserInfoType | ConsoleUserInfoType) => {
    this.log.debug("sync:closecom:user", user);
    // Get Cal.com generic Lead
    const leadId = await getCloseComGenericLeadId(this.closeCom);
    this.log.debug("sync:closecom:user:leadId", leadId);
    // Get Contacts ids: already creates contacts
    const [contactId] = await getCloseComContactIds([user], leadId, this.closeCom);
    this.log.debug("sync:closecom:user:contactsIds", contactId);
    // Get Custom Contact fields ids
    const customFieldsIds = await getCustomFieldsIds("contact", calComCustomContactFields, this.closeCom);
    this.log.debug("sync:closecom:user:customFieldsIds", customFieldsIds);
    const lastBooking = "id" in user ? await this.getUserLastBooking(user) : "N/A";
    this.log.debug("sync:closecom:user:lastBooking", lastBooking);
    // Prepare values for each Custom Contact Fields
    const customContactFieldsValues = [
      "username" in user ? user.username : "N/A", // Username
      user.plan, // Plan
      lastBooking, // Last Booking
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
    return await this.closeCom.contact.update(person);
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
