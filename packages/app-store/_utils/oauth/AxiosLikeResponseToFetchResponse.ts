/**
 * This class is used to convert axios like response to fetch response
 */
export class AxiosLikeResponseToFetchResponse<
  T extends {
    status: number;
    statusText: string;
    data: unknown;
  }
> extends Response {
  body: ReadableStream<Uint8Array> | null;

  constructor(axiomResponse: T) {
    super(JSON.stringify(axiomResponse.data), {
      status: axiomResponse.status,
      statusText: axiomResponse.statusText,
    });
    this.body = axiomResponse.data as unknown as ReadableStream<Uint8Array> | null;
  }
  async json() {
    return super.json() as unknown as T["data"];
  }
}
