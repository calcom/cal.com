import logger from "@calcom/lib/logger";
import { CalendarEvent } from "@calcom/types/Calendar";

export type CloseComLead = {
  companyName?: string | null | undefined;
  contactName?: string;
  contactEmail?: string;
  description?: string;
};

export type CloseComFieldOptions = [string, string, boolean, boolean][];

export type CloseComLeadCreateResult = {
  status_id: string;
  status_label: string;
  display_name: string;
  addresses: { [key: string]: any }[];
  name: string;
  contacts: { [key: string]: any }[];
  [key: CloseComCustomActivityCustomField<string>]: string;
  id: string;
};

export type CloseComStatus = {
  id: string;
  organization_id: string;
  label: string;
};

export type CloseComCustomActivityTypeCreate = {
  name: string;
  description: string;
};

export type CloseComContactSearch = {
  data: {
    __object_type: "contact";
    emails: {
      email: string;
      type: string;
    }[];
    id: string;
    lead_id: string;
    name: string;
  }[];
  cursor: null;
};

export type CloseComCustomActivityTypeGet = {
  data: {
    api_create_only: boolean;
    created_by: string;
    date_created: string;
    date_updated: string;
    description: string;
    editable_with_roles: string[];
    fields: CloseComCustomActivityFieldGet["data"][number][];
    id: string;
    name: string;
    organization_id: string;
    updated_by: string;
  }[];
  cursor: null;
};

export type CloseComCustomActivityFieldCreate = CloseComCustomContactFieldCreate & {
  custom_activity_type_id: string;
};

export type CloseComCustomContactFieldGet = {
  data: {
    id: string;
    name: string;
    description: string;
    type: string;
    choices?: string[];
    accepts_multiple_values: boolean;
    editable_with_roles: string[];
    date_created: string;
    date_updated: string;
    created_by: string;
    updated_by: string;
    organization_id: string;
  }[];
};

export type CloseComCustomContactFieldCreate = {
  name: string;
  description?: string;
  type: string;
  required: boolean;
  accepts_multiple_values: boolean;
  editable_with_roles: string[];
  choices?: string[];
};

export type CloseComCustomActivityFieldGet = {
  data: {
    id: string;
    name: string;
    description: string;
    type: string;
    choices?: string[];
    accepts_multiple_values: boolean;
    editable_with_roles: string[];
    date_created: string;
    date_updated: string;
    created_by: string;
    updated_by: string;
    organization_id: string;
    custom_activity_type_id: string;
  }[];
};

export type CloseComCustomActivityCreate = {
  custom_activity_type_id: string;
  lead_id: string;
  [key: CloseComCustomActivityCustomField<string>]: string;
};

export type typeCloseComCustomActivityGet = {
  organization_id: string;
  contact_id: any;
  date_updated: string;
  user_name: string;
  created_by_name: "Bruce Wayne";
  id: string;
  created_by: string;
  status: string;
  user_id: string;
  users: any[];
  lead_id: string;
  _type: string;
  updated_by: string;
  custom_activity_type_id: string;
  date_created: string;
  updated_by_name: string;
  [key: CloseComCustomActivityCustomField<string>]: string;
};

type CloseComCustomActivityCustomField<T extends string> = `custom.${T}`;

const environmentApiKey = process.env.CLOSECOM_API_KEY || "";

/**
 * This class to instance communicating to Close.com APIs requires an API Key.
 *
 * You can either pass to the constructor an API Key or have one defined as an
 * environment variable in case the communication to Close.com is just for
 * one account only, not configurable by any user at any moment.
 */
export default class CloseCom {
  private apiUrl = "https://api.close.com/api/v1";
  private apiKey: string | undefined = undefined;
  private log: typeof logger;

  constructor(providedApiKey = "") {
    this.log = logger.getChildLogger({ prefix: [`[[lib] close.com`] });
    if (!providedApiKey && !environmentApiKey) throw Error("Close.com Api Key not present");
    this.apiKey = providedApiKey || environmentApiKey;
  }

  public me = async () => {
    return this._get({ urlPath: "/me/" });
  };

  public contact = {
    search: async ({ emails }: { emails: string[] }): Promise<CloseComContactSearch> => {
      return this._post({
        urlPath: "/data/search/",
        data: closeComQueries.contact.search(emails),
      });
    },
    create: async (data: {
      person: { name: string | null; email: string };
      leadId: string;
    }): Promise<CloseComContactSearch["data"][number]> => {
      return this._post({ urlPath: "/contact/", data: closeComQueries.contact.create(data) });
    },
    update: async ({
      contactId,
      ...data
    }: {
      person: { name: string; email: string };
      contactId: string;
      leadId?: string;
    }): Promise<CloseComContactSearch["data"][number]> => {
      return this._put({
        urlPath: `/contact/${contactId}/`,
        data: closeComQueries.contact.update(data),
      });
    },
    delete: async (contactId: string) => {
      return this._delete({
        urlPath: `/contact/${contactId}/`,
      });
    },
  };

  public lead = {
    list: async ({
      query,
    }: {
      query: { [key: string]: any };
    }): Promise<{ data: { [key: string]: any }[] }> => {
      return this._get({ urlPath: "/lead", query });
    },
    status: async () => {
      return this._get({ urlPath: `/status/lead/` });
    },
    update: async (leadId: string, data: CloseComLead): Promise<CloseComLeadCreateResult> => {
      return this._put({
        urlPath: `/lead/${leadId}`,
        data,
      });
    },
    create: async (data: CloseComLead): Promise<CloseComLeadCreateResult> => {
      return this._post({
        urlPath: "/lead/",
        data: closeComQueries.lead.create(data),
      });
    },
    delete: async (leadId: string) => {
      return this._delete({ urlPath: `/lead/${leadId}/` });
    },
  };

  public customActivity = {
    type: {
      create: async (
        data: CloseComCustomActivityTypeCreate
      ): Promise<CloseComCustomActivityTypeGet["data"][number]> => {
        return this._post({
          urlPath: "/custom_activity",
          data: closeComQueries.customActivity.type.create(data),
        });
      },
      get: async (): Promise<CloseComCustomActivityTypeGet> => {
        return this._get({ urlPath: "/custom_activity" });
      },
    },
  };

  public customField = {
    activity: {
      create: async (
        data: CloseComCustomActivityFieldCreate
      ): Promise<CloseComCustomActivityFieldGet["data"][number]> => {
        return this._post({ urlPath: "/custom_field/activity/", data });
      },
      get: async ({ query }: { query: { [key: string]: any } }): Promise<CloseComCustomActivityFieldGet> => {
        return this._get({ urlPath: "/custom_field/activity/", query });
      },
    },
    contact: {
      create: async (
        data: CloseComCustomContactFieldCreate
      ): Promise<CloseComCustomContactFieldGet["data"][number]> => {
        return this._post({ urlPath: "/custom_field/contact/", data });
      },
      get: async ({ query }: { query: { [key: string]: any } }): Promise<CloseComCustomContactFieldGet> => {
        return this._get({ urlPath: "/custom_field/contact/", query });
      },
    },
    shared: {
      get: async ({ query }: { query: { [key: string]: any } }): Promise<CloseComCustomContactFieldGet> => {
        return this._get({ urlPath: "/custom_field/shared/", query });
      },
    },
  };

  public activity = {
    custom: {
      create: async (
        data: CloseComCustomActivityCreate
      ): Promise<CloseComCustomActivityTypeGet["data"][number]> => {
        return this._post({ urlPath: "/activity/custom/", data });
      },
      delete: async (uuid: string) => {
        return this._delete({ urlPath: `/activity/custom/${uuid}/` });
      },
      update: async (
        uuid: string,
        data: Partial<CloseComCustomActivityCreate>
      ): Promise<CloseComCustomActivityTypeGet["data"][number]> => {
        return this._put({ urlPath: `/activity/custom/${uuid}/`, data });
      },
    },
  };

  private _get = async ({ urlPath, query }: { urlPath: string; query?: { [key: string]: any } }) => {
    return await this._request({ urlPath, method: "get", query });
  };
  private _post = async ({ urlPath, data }: { urlPath: string; data: Record<string, unknown> }) => {
    return this._request({ urlPath, method: "post", data });
  };
  private _put = async ({ urlPath, data }: { urlPath: string; data: Record<string, unknown> }) => {
    return this._request({ urlPath, method: "put", data });
  };
  private _delete = async ({ urlPath }: { urlPath: string }) => {
    return this._request({ urlPath, method: "delete" });
  };

  private _request = async ({
    urlPath,
    data,
    method,
    query,
  }: {
    urlPath: string;
    method: string;
    query?: { [key: string]: any };
    data?: Record<string, unknown>;
  }) => {
    this.log.debug(method, urlPath, query, data);
    const credentials = Buffer.from(`${this.apiKey}:`).toString("base64");
    const headers = {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    };
    const queryString = query ? `?${new URLSearchParams(query).toString()}` : "";
    return await fetch(`${this.apiUrl}${urlPath}${queryString}`, {
      headers,
      method,
      body: JSON.stringify(data),
    }).then(async (response) => {
      if (!response.ok) {
        const message = `[Close.com app] An error has occured: ${response.status}`;
        this.log.error(await response.json());
        throw new Error(message);
      }
      return await response.json();
    });
  };

  public async getCloseComContactIds(
    persons: { email: string; name: string | null }[],
    leadFromCalComId?: string
  ): Promise<string[]> {
    // Check if persons exist or to see if any should be created
    const closeComContacts = await this.contact.search({
      emails: persons.map((att) => att.email),
    });
    // NOTE: If contact is duplicated in Close.com we will get more results
    //       messing around with the expected number of contacts retrieved
    if (closeComContacts.data.length < persons.length && leadFromCalComId) {
      // Create missing contacts
      const personsEmails = persons.map((att) => att.email);
      // Existing contacts based on persons emails: contacts may have more
      // than one email, we just need the one used by the event.
      const existingContactsEmails = closeComContacts.data.flatMap((cont) =>
        cont.emails.filter((em) => personsEmails.includes(em.email)).map((ems) => ems.email)
      );
      const nonExistingContacts = persons.filter((person) => !existingContactsEmails.includes(person.email));
      const createdContacts = await Promise.all(
        nonExistingContacts.map(
          async (per) =>
            await this.contact.create({
              person: per,
              leadId: leadFromCalComId,
            })
        )
      );
      if (createdContacts.length === nonExistingContacts.length) {
        // All non existent contacts where created
        return Promise.resolve(
          closeComContacts.data.map((cont) => cont.id).concat(createdContacts.map((cont) => cont.id))
        );
      } else {
        return Promise.reject("Some contacts were not possible to create in Close.com");
      }
    } else {
      return Promise.resolve(closeComContacts.data.map((cont) => cont.id));
    }
  }

  public async getCustomActivityTypeInstanceData(
    event: CalendarEvent,
    customFields: CloseComFieldOptions
  ): Promise<CloseComCustomActivityCreate> {
    // Get Cal.com generic Lead
    const leadFromCalComId = await this.getCloseComLeadId();
    // Get Contacts ids
    const contactsIds = await this.getCloseComContactIds(event.attendees, leadFromCalComId);
    // Get Custom Activity Type id
    const customActivityTypeAndFieldsIds = await this.getCloseComCustomActivityTypeFieldsIds(customFields);
    // Prepare values for each Custom Activity Fields
    const customActivityFieldsValues = [
      contactsIds.length > 1 ? contactsIds.slice(1) : null, // Attendee
      event.startTime, // Date & Time
      event.attendees[0].timeZone, // Time Zone
      contactsIds[0], // Organizer
      event.additionalNotes ?? null, // Additional Notes
    ];
    // Preparing Custom Activity Instance data for Close.com
    return Object.assign(
      {},
      {
        custom_activity_type_id: customActivityTypeAndFieldsIds.activityType,
        lead_id: leadFromCalComId,
      }, // This is to add each field as `"custom.FIELD_ID": "value"` in the object
      ...customActivityTypeAndFieldsIds.fields.map((fieldId: string, index: number) => {
        return {
          [`custom.${fieldId}`]: customActivityFieldsValues[index],
        };
      })
    );
  }

  public async getCustomFieldsIds(
    entity: keyof CloseCom["customField"],
    customFields: CloseComFieldOptions,
    custom_activity_type_id?: string
  ): Promise<string[]> {
    // Get Custom Activity Fields
    const allFields: CloseComCustomActivityFieldGet | CloseComCustomContactFieldGet = await this.customField[
      entity
    ].get({
      query: { _fields: ["name", "id"].concat(entity === "activity" ? ["custom_activity_type_id"] : []) },
    });
    let relevantFields: { [key: string]: any }[];
    if (entity === "activity") {
      relevantFields = (allFields as CloseComCustomActivityFieldGet).data.filter(
        (fie) => fie.custom_activity_type_id === custom_activity_type_id
      );
    } else {
      relevantFields = allFields.data as CloseComCustomActivityFieldGet["data"];
    }
    const customFieldsNames = relevantFields.map((fie) => fie.name);
    const customFieldsExist = customFields.map((cusFie) => customFieldsNames.includes(cusFie[0]));
    return await Promise.all(
      customFieldsExist.map(async (exist, idx) => {
        if (!exist && entity !== "shared") {
          const [name, type, required, multiple] = customFields[idx];
          let created: { [key: string]: any };
          if (entity === "activity" && custom_activity_type_id) {
            created = await this.customField[entity].create({
              name,
              type,
              required,
              accepts_multiple_values: multiple,
              editable_with_roles: [],
              custom_activity_type_id,
            });
            return created.id;
          } else {
            if (entity === "contact") {
              created = await this.customField[entity].create({
                name,
                type,
                required,
                accepts_multiple_values: multiple,
                editable_with_roles: [],
              });
              return created.id;
            }
          }
        } else {
          const index = customFieldsNames.findIndex((val) => val === customFields[idx][0]);
          if (index >= 0) {
            return relevantFields[index].id;
          } else {
            throw Error("Couldn't find the field index");
          }
        }
      })
    );
  }

  public async getCloseComCustomActivityTypeFieldsIds(customFields: CloseComFieldOptions) {
    // Check if Custom Activity Type exists
    const customActivities = await this.customActivity.type.get();
    const calComCustomActivity = customActivities.data.filter((act) => act.name === "Cal.com Activity");
    if (calComCustomActivity.length > 0) {
      // Cal.com Custom Activity type exist
      // Get Custom Activity Type fields ids
      const fields = await this.getCustomFieldsIds("activity", customFields, calComCustomActivity[0].id);
      return {
        activityType: calComCustomActivity[0].id,
        fields,
      };
    } else {
      // Cal.com Custom Activity type doesn't exist
      // Create Custom Activity Type
      const { id: activityType } = await this.customActivity.type.create({
        name: "Cal.com Activity",
        description: "Bookings in your Cal.com account",
      });
      // Create Custom Activity Fields
      const fields = await Promise.all(
        customFields.map(async ([name, type, required, multiple]) => {
          const creation = await this.customField.activity.create({
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
        fields,
      };
    }
  }

  public async getCloseComLeadId(
    leadInfo: CloseComLead = {
      companyName: "From Cal.com",
      description: "Generic Lead for Contacts created by Cal.com",
    }
  ): Promise<string> {
    debugger;
    const closeComLeadNames = await this.lead.list({ query: { _fields: ["name", "id"] } });
    const searchLeadFromCalCom = closeComLeadNames.data.filter((lead) => lead.name === leadInfo.companyName);
    if (searchLeadFromCalCom.length === 0) {
      // No Lead exists, create it
      const createdLeadFromCalCom = await this.lead.create(leadInfo);
      return createdLeadFromCalCom.id;
    } else {
      return searchLeadFromCalCom[0].id;
    }
  }
}

export const closeComQueries = {
  contact: {
    search(contactEmails: string[]) {
      return {
        limit: null,
        _fields: {
          contact: ["id", "name", "emails"],
        },
        query: {
          negate: false,
          queries: [
            {
              negate: false,
              object_type: "contact",
              type: "object_type",
            },
            {
              negate: false,
              queries: [
                {
                  negate: false,
                  related_object_type: "contact_email",
                  related_query: {
                    negate: false,
                    queries: contactEmails.map((contactEmail) => ({
                      condition: {
                        mode: "full_words",
                        type: "text",
                        value: contactEmail,
                      },
                      field: {
                        field_name: "email",
                        object_type: "contact_email",
                        type: "regular_field",
                      },
                      negate: false,
                      type: "field_condition",
                    })),
                    type: "or",
                  },
                  this_object_type: "contact",
                  type: "has_related",
                },
              ],
              type: "and",
            },
          ],
          type: "and",
        },
        results_limit: null,
        sort: [],
      };
    },
    create(data: { person: { name: string | null; email: string }; leadId: string }) {
      return {
        lead_id: data.leadId,
        name: data.person.name ?? data.person.email,
        emails: [{ email: data.person.email, type: "office" }],
      };
    },
    update({ person, leadId, ...rest }: { person: { name: string; email: string }; leadId?: string }) {
      return {
        ...(leadId && { lead_id: leadId }),
        name: person.name ?? person.email,
        emails: [{ email: person.email, type: "office" }],
        ...rest,
      };
    },
  },
  lead: {
    create({ companyName, contactEmail, contactName, description }: CloseComLead) {
      return {
        name: companyName,
        ...(description ? { description } : {}),
        ...(contactEmail && contactName
          ? {
              contacts: [
                {
                  name: contactName,
                  email: contactEmail,
                  emails: [
                    {
                      type: "office",
                      email: contactEmail,
                    },
                  ],
                },
              ],
            }
          : {}),
      };
    },
  },
  customActivity: {
    type: {
      create({ name, description }: CloseComCustomActivityTypeCreate) {
        return {
          name: name,
          description: description,
          api_create_only: false,
          editable_with_roles: ["admin"],
        };
      },
    },
  },
  customField: {
    activity: {
      create({
        custom_activity_type_id,
        name,
        type,
        required,
        accepts_multiple_values,
      }: CloseComCustomActivityFieldCreate) {
        return {
          custom_activity_type_id,
          name,
          type,
          required,
          accepts_multiple_values,
          editable_with_roles: [],
        };
      },
    },
  },
};
