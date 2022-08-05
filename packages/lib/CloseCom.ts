export type CloseComLead = {
  companyName?: string;
  contactName?: string;
  contactEmail?: string;
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
};

export type CloseComCustomActivityFieldCreate = {
  custom_activity_type_id: string;
  name: string;
  type: string;
  required: boolean;
  accepts_multiple_values: boolean;
  editable_with_roles: string[];
};

export type CloseComCustomActivityFieldGet = {
  data: {
    custom_activity_type_id: string;
    id: string;
    name: string;
    description: string;
    type: string;
    required: boolean;
    accepts_multiple_values: boolean;
    editable_with_roles: string[];
    created_by: string;
    updated_by: string;
    date_created: string;
    date_updated: string;
    organization_id: string;
  }[];
};

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

  constructor(providedApiKey = "") {
    if (!providedApiKey && !environmentApiKey) throw Error("Close.com Api Key not present");
    this.apiKey = providedApiKey || environmentApiKey;
  }

  public static lead(): [CloseCom, CloseComLead] {
    return [new this(), {} as CloseComLead];
  }

  public me = async () => {
    return this._get({ url: `${this.apiUrl}/me/` });
  };

  public contact = {
    search: async ({ emails }: { emails: string[] }) => {
      return this._post({
        url: `${this.apiUrl}/data/search/`,
        data: closeComQueries.contact.getContactSearchQuery(emails),
      });
    },
  };

  public lead = {
    status: async () => {
      return this._get({ url: `${this.apiUrl}/status/lead/` });
    },
    create: async (data: CloseComLead) => {
      return this._post({
        url: `${this.apiUrl}/lead/`,
        data: closeComQueries.lead.getCreateLeadQuery(data),
      });
    },
  };

  public customActivity = {
    type: {
      create: async (
        data: CloseComCustomActivityTypeCreate
      ): Promise<CloseComCustomActivityTypeGet["data"][number]> => {
        return this._post({
          url: `${this.apiUrl}/custom_activity`,
          data: closeComQueries.customActivity.type.create(data),
        });
      },
      get: async (): Promise<CloseComCustomActivityTypeGet> => {
        return this._get({ url: `${this.apiUrl}/custom_activity` });
      },
    },
  };

  public customField = {
    activity: {
      create: async (
        data: CloseComCustomActivityFieldCreate
      ): Promise<CloseComCustomActivityFieldGet["data"][number]> => {
        return this._post({ url: `${this.apiUrl}/custom_field/activity/`, data });
      },
      get: async (): Promise<CloseComCustomActivityFieldGet> => {
        return this._get({ url: `${this.apiUrl}/custom_field/activity/` });
      },
    },
  };

  private _get = async ({ url, ...rest }: { url: string }) => {
    return await this._request({ url, method: "get", ...rest });
  };
  private _post = async ({ url, data, ...rest }: { url: string; data: Record<string, unknown> }) => {
    return this._request({ url, method: "post", data, ...rest });
  };
  private _delete = async ({ url, ...rest }: { url: string }) => {
    return this._request({ url, method: "delete", ...rest });
  };
  private _request = async ({
    url,
    data,
    ...rest
  }: {
    url: string;
    method: string;
    data?: Record<string, unknown>;
  }) => {
    const credentials = Buffer.from(`${this.apiKey}:`).toString("base64");
    const headers = {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    };
    return await fetch(url, { headers, body: JSON.stringify(data), ...rest }).then(async (response) => {
      if (!response.ok) {
        const message = `An error has occured: ${response.status}`;
        throw new Error(message);
      }
      return await response.json();
    });
  };
}

export const closeComQueries = {
  contact: {
    getContactSearchQuery(contactEmails: string[]) {
      return {
        limit: null,
        _fields: {
          contact: ["id", "name"],
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
  },
  lead: {
    getCreateLeadQuery({ companyName, contactEmail, contactName }: CloseComLead) {
      return {
        name: companyName,
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
