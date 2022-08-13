import CloseCom from "@calcom/lib/CloseCom";
import {
  getCloseComContactIds,
  getCloseComGenericLeadId,
  getCustomFieldsIds,
} from "@calcom/lib/CloseComeUtils";
import logger from "@calcom/lib/logger";
import ISyncService, { IContactParams } from "@calcom/lib/sync/SyncService";

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

  public contact = {
    create: async (data: IContactParams) => {
      return this.contact.update(data);
    },
    update: async (data: IContactParams) => {
      this.log.debug("sync:closecom:contact", data);
      // Get Cal.com generic Lead
      const leadId = await getCloseComGenericLeadId(this.closeCom);
      this.log.debug("sync:closecom:contact:leadId", leadId);
      // Get Contacts ids: already creates contacts
      const contactsIds = await getCloseComContactIds([data.person], leadId, this.closeCom);
      this.log.debug("sync:closecom:contact:contactsIds", contactsIds);
      // Get Custom Contact fields ids
      const customFieldsIds = await getCustomFieldsIds("contact", calComCustomContactFields, this.closeCom);
      this.log.debug("sync:closecom:contact:customFieldsIds", customFieldsIds);
      // Prepare values for each Custom Contact Fields
      const customContactFieldsValues = [
        data.person.username, // Username
        "", // Plan
        new Date().toISOString(), // Last booking
      ];
      // Preparing Custom Activity Instance data for Close.com
      const person = Object.assign(
        {},
        data.person,
        {
          lead_id: leadId,
        },
        ...customFieldsIds.map((fieldId: string, index: number) => {
          return {
            [`custom.${fieldId}`]: customContactFieldsValues[index],
          };
        })
      );
      // Create Custom Activity type instance
      return await this.closeCom.contact.update(person);
    },
  };
}
