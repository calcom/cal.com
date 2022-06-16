import { contactQueries } from "./CloseQueries";

export default class CloseApi {
  private apiUrl = "https://api.close.com/api/v1/";
  private apiKey: string | undefined = undefined;

  constructor() {
    if (!process.env.CLOSECOM_API_KEY) throw Error("Close.com Api Key not present");
    this.apiKey = process.env.CLOSECOM_API_KEY;
  }

  public contact = async () => {
    const url = `${this.apiUrl}/data/search/`;
    return {
      search: async ({ emails }: { emails: string[] }) => {
        return this._post({ url, data: contactQueries.getContactSearchQuery(emails) });
      },
    };
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
    return await fetch(url, { headers, body: JSON.stringify(data), ...rest });
  };
}
