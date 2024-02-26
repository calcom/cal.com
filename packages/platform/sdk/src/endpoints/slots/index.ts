import type { CalSdk } from "../../cal";
import { SlotsEndpoints } from "../../lib/endpoints";
import { ApiVersion, type BasicPlatformResponse, type ResponseStatus } from "../../types";
import { EndpointHandler } from "../endpoint-handler";
import type {
  AvailableSlots,
  GetAvaialbleSlotsArgs,
  RemoveSelectedSlotArgs,
  ReserveSlotArgs,
  SlotUID,
} from "./types";

export class Slots extends EndpointHandler {
  constructor(private readonly sdk: CalSdk) {
    super("slots", sdk, ApiVersion.V2);
  }

  async reserveSlot(args: ReserveSlotArgs): Promise<SlotUID> {
    const { data } = await this.sdk.httpCaller.post<BasicPlatformResponse<SlotUID>>(
      this.createReqUrl(SlotsEndpoints.RESERVE_SLOT),
      args
    );
    return data;
  }

  async removeSelectedSlot(args: RemoveSelectedSlotArgs): Promise<ResponseStatus> {
    const { status } = await this.sdk.httpCaller.delete<BasicPlatformResponse>(
      this.createReqUrl(SlotsEndpoints.DELETE_SELECTED_SLOT),
      { params: args }
    );
    return status === "success" ? "success" : "error";
  }

  async getAvailableSlots(args: GetAvaialbleSlotsArgs): Promise<AvailableSlots> {
    const { data } = await this.sdk.httpCaller.get<BasicPlatformResponse<AvailableSlots>>(
      this.createReqUrl(SlotsEndpoints.AVAILABLE_SLOTS),
      {
        params: args,
      }
    );
    return data;
  }
}
