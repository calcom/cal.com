import { VERSION_2024_09_04 } from "@/lib/api-versions";
import { GetSlotsOutput_2024_09_04 } from "@/modules/slots/slots-2024-09-04/outputs/get-slots.output";
import { ReserveSlotOutput_2024_09_04 } from "@/modules/slots/slots-2024-09-04/outputs/reserve-slot.output";
import { SlotsService_2024_09_04 } from "@/modules/slots/slots-2024-09-04/services/slots.service";
import { Query, Body, Controller, Get, Delete, Post, Param } from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  GetSlotsInput_2024_09_04,
  GetSlotsInputPipe,
  ReserveSlotInput_2024_09_04,
} from "@calcom/platform-types";
import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "/v2/slots",
  version: VERSION_2024_09_04,
})
@DocsTags("Slots")
export class SlotsController_2024_09_04 {
  constructor(private readonly slotsService: SlotsService_2024_09_04) {}

  @Post("/")
  async reserveSlot(@Body() body: ReserveSlotInput_2024_09_04): Promise<ReserveSlotOutput_2024_09_04> {
    const uid = await this.slotsService.reserveSlot(body);

    return {
      status: SUCCESS_STATUS,
      data: {
        uid,
      },
    };
  }

  @Get("/")
  async getAvailableSlots(
    @Query(new GetSlotsInputPipe()) query: GetSlotsInput_2024_09_04
  ): Promise<GetSlotsOutput_2024_09_04> {
    const slots = await this.slotsService.getAvailableSlots(query);

    return {
      data: slots,
      status: SUCCESS_STATUS,
    };
  }

  @Delete("/:uid")
  async deleteSelectedSlot(@Param("uid") uid: string): Promise<ApiResponse> {
    await this.slotsService.deleteSelectedSlot(uid);

    return {
      status: SUCCESS_STATUS,
    };
  }
}
