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

export default class CloseCom {
  private apiUrl = "https://api.close.com/api/v1/";
  private apiKey: string | undefined = undefined;

  constructor() {
    if (!process.env.CLOSECOM_API_KEY) throw Error("Close.com Api Key not present");
    this.apiKey = process.env.CLOSECOM_API_KEY;
  }

  public static lead(): [CloseCom, CloseComLead] {
    return [new this(), {} as CloseComLead];
  }

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
};
