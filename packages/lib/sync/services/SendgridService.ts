import sendgrid from "@sendgrid/client";
import { ClientRequest } from "@sendgrid/client/src/request";
import { ClientResponse } from "@sendgrid/client/src/response";

import logger from "@calcom/lib/logger";
import ISyncService, { ConsoleUserInfoType, WebUserInfoType } from "@calcom/lib/sync/ISyncService";
import SyncServiceCore from "@calcom/lib/sync/ISyncService";

type SendgridFieldDefinitions = {
  custom_fields: {
    id: string;
    name: string;
    field_type: string;
    _metadata: {
      self: string;
    };
  }[];
};

type SendgridNewContact = {
  job_id: string;
};

// Cal.com Custom Contact Fields
const calComCustomContactFields: [string, string][] = [
  // Field name, field type
  ["username", "Text"],
  ["plan", "Text"],
  ["last_booking", "Date"], // Sendgrid custom fields only allow alphanumeric characters (letters A-Z, numbers 0-9) and underscores.
];

type SendgridRequest = <R = ClientResponse>(data: ClientRequest) => Promise<R>;

const serviceName = "sendgrid_service";

export default class SendgridService extends SyncServiceCore implements ISyncService {
  constructor() {
    if (!process.env.SENDGRID_API_KEY) throw Error("Sendgrid Api Key not present");
    sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
    super(serviceName, sendgrid, logger.getChildLogger({ prefix: [`[[sync] ${serviceName}`] }));
  }

  sendgridRequest: SendgridRequest = async (data: ClientRequest) => {
    const results = await this.service.request(data);
    if (results[1].errors) throw Error(`Sendgrid request error: ${results[1].errors}`);
    return results[1];
  };

  getCustomFieldsIds = async () => {
    // Get Custom Activity Fields
    const allFields = await this.sendgridRequest<SendgridFieldDefinitions>({
      url: `/v3/marketing/field_definitions`,
      method: "GET",
    });
    allFields.custom_fields = allFields.custom_fields ?? [];
    this.log.debug("sync:sendgrid:getCustomFieldsIds:allFields", allFields);
    const customFieldsNames = allFields.custom_fields.map((fie) => fie.name);
    this.log.debug("sync:sendgrid:getCustomFieldsIds:customFieldsNames", customFieldsNames);
    const customFieldsExist = calComCustomContactFields.map((cusFie) =>
      customFieldsNames.includes(cusFie[0])
    );
    this.log.debug("sync:sendgrid:getCustomFieldsIds:customFieldsExist", customFieldsExist);
    return await Promise.all(
      customFieldsExist.map(async (exist, idx) => {
        if (!exist) {
          const [name, field_type] = calComCustomContactFields[idx];
          const created = await this.sendgridRequest<SendgridFieldDefinitions["custom_fields"][number]>({
            url: `/v3/marketing/field_definitions`,
            method: "POST",
            body: {
              name,
              field_type,
            },
          });
          this.log.debug("sync:sendgrid:getCustomFieldsIds:customField:created", created);
          return created.id;
        } else {
          const index = customFieldsNames.findIndex((val) => val === calComCustomContactFields[idx][0]);
          if (index >= 0) {
            this.log.debug(
              "sync:sendgrid:getCustomFieldsIds:customField:existed",
              allFields.custom_fields[index].id
            );
            return allFields.custom_fields[index].id;
          } else {
            throw Error("Couldn't find the field index");
          }
        }
      })
    );
  };

  upsert = async (user: WebUserInfoType | ConsoleUserInfoType) => {
    this.log.debug("sync:sendgrid:user", user);
    // Get Custom Contact fields ids
    const customFieldsIds = await this.getCustomFieldsIds();
    this.log.debug("sync:sendgrid:user:customFieldsIds", customFieldsIds);
    const lastBooking = "id" in user ? await this.getUserLastBooking(user) : null;
    this.log.debug("sync:sendgrid:user:lastBooking", lastBooking);
    const username = "username" in user ? user.username : null;
    // Prepare values for each Custom Contact Fields
    const customContactFieldsValues = [
      username, // Username
      user.plan, // Plan
      lastBooking ? lastBooking.createdAt : null, // Last Booking
    ];
    this.log.debug("sync:sendgrid:contact:customContactFieldsValues", customContactFieldsValues);
    // Preparing Custom Activity Instance data for Sendgrid
    const contactData = {
      first_name: user.name,
      email: user.email,
      custom_fields: Object.assign(
        {},
        ...customFieldsIds.map((fieldId: string, index: number) => {
          if (customContactFieldsValues[index] !== null) {
            return {
              [fieldId]: customContactFieldsValues[index],
            };
          }
        })
      ),
    };
    this.log.debug("sync:sendgrid:contact:contactData", contactData);
    const newContact = await this.sendgridRequest<SendgridNewContact>({
      url: `/v3/marketing/contacts`,
      method: "PUT",
      body: {
        contacts: [contactData],
      },
    });
    // Create contact
    this.log.debug("sync:sendgrid:contact:newContact", newContact);
    return newContact;
  };

  public console = {
    user: {
      upsert: async (consoleUser: ConsoleUserInfoType) => {
        return this.upsert(consoleUser);
      },
    },
  };

  public web = {
    user: {
      upsert: async (webUser: WebUserInfoType) => {
        return this.upsert(webUser);
      },
    },
  };
}
