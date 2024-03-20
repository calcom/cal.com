import type { CalSdk } from "../../cal";
import { Endpoints } from "../../lib/endpoints";
import { type BasicPlatformResponse, type ResponseStatus } from "../../types";
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
    super("slots", sdk);
  }

  async reserveSlot(args: ReserveSlotArgs): Promise<SlotUID> {
    const { data } = await this.sdk.httpCaller.post<BasicPlatformResponse<SlotUID>>(Endpoints.RESERVE_SLOT, {
      body: args,
    });
    return data;
  }

  async removeSelectedSlot(args: RemoveSelectedSlotArgs): Promise<ResponseStatus> {
    const { status } = await this.sdk.httpCaller.delete<BasicPlatformResponse>(
      Endpoints.DELETE_SELECTED_SLOT,
      {
        config: { params: args },
      }
    );
    return status === "success" ? "success" : "error";
  }

  async getAvailableSlots(args: GetAvaialbleSlotsArgs): Promise<AvailableSlots> {
    const { data } = await this.sdk.httpCaller.get<BasicPlatformResponse<AvailableSlots>>(
      Endpoints.AVAILABLE_SLOTS,
      {
        config: {
          params: args,
        },
      }
    );
    return data;
  }
}
