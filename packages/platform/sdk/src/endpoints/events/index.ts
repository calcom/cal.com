import type { CalSdk } from "../../cal";
import { Endpoints } from "../../lib/endpoints";
import type { BasicPlatformResponse } from "../../types";
import { EndpointHandler } from "../endpoint-handler";
import type { Event, GetPublicEventArgs } from "./types";

export class Events extends EndpointHandler {
  constructor(private readonly sdk: CalSdk) {
    super("events", sdk);
  }

  async getPublicEvent(input: GetPublicEventArgs): Promise<Event> {
    const { data } = await this.sdk.httpCaller.get<BasicPlatformResponse<Event>>(Endpoints.GET_PUBLIC_EVENT, {
      config: {
        params: input,
      },
    });

    return data;
  }
}
