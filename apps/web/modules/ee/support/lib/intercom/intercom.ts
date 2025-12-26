import { safeStringify } from "@calcom/lib/safeStringify";

export interface Contact extends CreateContact {
  id: string;
}

interface CreateContact {
  type: "contact" | "lead";
  external_id: string;
  email: string;
  name: string;
  custom_attributes?: object;
}

interface IntercomResponse<T> {
  data?: T;
  error?: string;
}

interface CreateConversation {
  from: {
    type: string;
    id: string;
  };
  body: string;
}

const INTERCOM_API_ENDPOINT = "https://api.intercom.io";
const INTERCOM_API_TOKEN = process.env.INTERCOM_API_TOKEN;
export const intercom = {
  async getContactByEmail(email: string): Promise<IntercomResponse<Contact | null>> {
    try {
      const res = await fetch(`${INTERCOM_API_ENDPOINT}/contacts/search`, {
        method: "POST",
        body: JSON.stringify({
          query: {
            operator: "AND",
            value: [
              {
                field: "email",
                operator: "=",
                value: email,
              },
            ],
          },
          pagination: {
            per_page: 1,
          },
        }),
        headers: {
          Authorization: `Bearer ${INTERCOM_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const body = await res.json();
        return {
          error: body?.errors[0]?.message,
        };
      }

      const { data } = (await res.json()) as { type: string; data: Contact[] };

      if (data.length === 0) {
        return {
          data: null,
        };
      }
      return {
        data: data[0],
      };
    } catch (err) {
      console.error(`Unexpected error while fetching contact data from email: ${safeStringify(err)}`);
      return {
        error: "Unexpected error while fetching contact data from email",
      };
    }
  },
  async createContact(data: CreateContact): Promise<IntercomResponse<Contact>> {
    try {
      const res = await fetch(`${INTERCOM_API_ENDPOINT}/contacts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${INTERCOM_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error(`Error creating contact from email ${data.email}: `, safeStringify(data));
        return {
          error: data?.errors[0]?.message ?? "Error creating contact from email",
        };
      }

      const contact = (await res.json()) as Contact;
      return {
        data: contact,
      };
    } catch (err) {
      console.error(`Unexpected error while creating contact from email: ${safeStringify(err)}`);
      return {
        error: "Unexpected error while creating contact from email",
      };
    }
  },
  async createConversation({ from, body }: CreateConversation): Promise<IntercomResponse<boolean>> {
    try {
      const response = await fetch(`https://api.intercom.io/conversations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${INTERCOM_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          body,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Intercom API error:", safeStringify(errorData));
        return {
          error: `Intercom Err: ${errorData?.errors?.[0].message ?? "Error creating conversation"}`,
        };
      }

      return {
        data: true,
      };
    } catch (err) {
      console.error(`Unexpected error while creating conversation from email: ${safeStringify(err)}`);
      return {
        error: "Unexpected error while creating contact from email",
      };
    }
  },
};
