import logger from "@calcom/lib/logger";

export type AttioTaskResponse = {
  data: {
    id: {
      workspace_id: string;
      task_id: string;
    };
    content_plaintext: string;
    is_completed: boolean;
    deadline_at: string;
  };
};

export type AttioEmailValue = {
  active_until: string | null;
  email_address: string;
};

export type AttioSearchResponse = {
  data: Array<{
    id: {
      workspace_id: string;
      record_id: string;
    };
    values: {
      email_addresses: AttioEmailValue[];
    };
  }>;
};

export type AttioContactResponse = {
  data: {
    id: {
      workspace_id: string;
      record_id: string;
    };
    values: {
      email_addresses: Array<{
        active_until: string | null;
        email_address: string;
      }>;
    };
  };
};

export type AttioUserResponse = {
  authorized_by_workspace_member_id: string;
};

/**
 * This class handles communication with Attio APIs using OAuth.
 * It provides methods for managing tasks, contacts, and user details.
 */
export default class Attio {
  private apiUrl = "https://api.attio.com/v2";
  private accessToken: string;
  private log: typeof logger;

  constructor(accessToken: string) {
    this.log = logger.getSubLogger({ prefix: [`[[lib] attio`] });
    this.accessToken = accessToken;
  }

  private async getHeaders() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
    };
  }

  private async _request<T>({
    urlPath,
    data,
    method,
  }: {
    urlPath: string;
    method: string;
    data?: Record<string, unknown>;
  }): Promise<T> {
    const headers = await this.getHeaders();

    const response = await fetch(`${this.apiUrl}${urlPath}`, {
      headers,
      method,
      body: data ? JSON.stringify(data) : undefined,
    });

    const responseData = await response.json();

    if (!response.ok) {
      const message = `[Attio app] An error has occurred: ${response.status}`;
      this.log.error(responseData);
      throw new Error(message);
    }

    return responseData as T;
  }

  private _get = async <T>({ urlPath }: { urlPath: string }): Promise<T> => {
    return this._request<T>({ urlPath, method: "GET" });
  };

  private _post = async <T>({
    urlPath,
    data,
  }: {
    urlPath: string;
    data: Record<string, unknown>;
  }): Promise<T> => {
    return this._request<T>({ urlPath, method: "POST", data });
  };

  private _patch = async <T>({
    urlPath,
    data,
  }: {
    urlPath: string;
    data: Record<string, unknown>;
  }): Promise<T> => {
    return this._request<T>({ urlPath, method: "PATCH", data });
  };

  private _delete = async ({ urlPath }: { urlPath: string }): Promise<void> => {
    return this._request({ urlPath, method: "DELETE" });
  };

  public task = {
    create: async (data: {
      format: string;
      is_completed: boolean;
      linked_records: Array<{
        target_object: string;
        target_record_id: string;
      }>;
      assignees: Array<{
        referenced_actor_type: string;
        referenced_actor_id: string;
      }>;
      content: string;
      deadline_at: string;
    }): Promise<AttioTaskResponse> => {
      return this._post<AttioTaskResponse>({
        urlPath: "/tasks",
        data: { data },
      });
    },
    update: async (
      taskId: string,
      data: {
        deadline_at: string;
      }
    ): Promise<AttioTaskResponse> => {
      return this._patch<AttioTaskResponse>({
        urlPath: `/tasks/${taskId}`,
        data: { data },
      });
    },
    delete: async (taskId: string): Promise<void> => {
      return this._delete({ urlPath: `/tasks/${taskId}` });
    },
  };

  public contact = {
    search: async ({ emails }: { emails: string[] }): Promise<AttioSearchResponse> => {
      return this._post<AttioSearchResponse>({
        urlPath: "/objects/people/records/query",
        data: {
          filter: {
            $or: emails.map((email) => ({
              email_addresses: {
                email_address: {
                  $eq: email,
                },
              },
            })),
          },
        },
      });
    },
    create: async (data: {
      values: {
        email_addresses: Array<{ email_address: string }>;
        name: Array<{
          first_name: string;
          last_name: string;
          full_name: string;
        }>;
      };
    }): Promise<AttioContactResponse> => {
      return this._post<AttioContactResponse>({
        urlPath: "/objects/people/records",
        data: { data },
      });
    },
  };

  public user = {
    getSelf: async (): Promise<AttioUserResponse> => {
      return this._get<AttioUserResponse>({ urlPath: "/self" });
    },
  };
}
