import type { CalSdk } from "../../../cal";
import { Endpoints } from "../../../lib/endpoints";
import type { BasicPlatformResponse } from "../../../types";
import { EndpointHandler } from "../../endpoint-handler";
import type { CreateEventTypeArgs, EventType, GetEventTypeByIdArgs } from "./types";

export class EventTypes extends EndpointHandler {
  constructor(private readonly sdk: CalSdk) {
    super("event-types", sdk);
  }

  async createEventType(args: CreateEventTypeArgs): Promise<EventType> {
    this.assertAccessToken("createEventType");

    const { data } = await this.sdk.httpCaller.post<BasicPlatformResponse<EventType>>(
      Endpoints.CREATE_EVENT_TYPE,
      {
        body: args,
      }
    );

    return data;
  }

  async getEventType(args: GetEventTypeByIdArgs): Promise<EventType> {
    this.assertAccessToken("getEventType");

    const { data } = await this.sdk.httpCaller.get<BasicPlatformResponse<EventType>>(
      Endpoints.GET_EVENT_TYPE_BY_ID,
      {
        urlParams: [args.id],
        config: this.withForAtomParam(args.forAtom ?? false),
      }
    );

    return data;
  }
}
