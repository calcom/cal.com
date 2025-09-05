/**
 * This class is used to convert axios like response to fetch response
 */
export class AxiosLikeResponseToFetchResponse<
  T extends {
    status: number;
    statusText: string;
    data: unknown;
  },
> extends Response {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
  constructor(axiomResponse: T) {
    super(JSON.stringify(axiomResponse.data), {
      status: axiomResponse.status,
      statusText: axiomResponse.statusText,
    });
  }
  async json() {
    return super.json() as unknown as T["data"];
  }
}
