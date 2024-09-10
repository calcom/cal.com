import { VERSION_2024_09_04 } from "@/lib/api-versions";
import { Cookies } from "@/lib/decorators/cookies.decorator";
import { GetSlotsOutput_2024_09_04 } from "@/modules/slots/slots-2024-09-04/outputs/get-slots.output";
import { ReserveSlotOutput_2024_09_04 } from "@/modules/slots/slots-2024-09-04/outputs/reserve-slot.output";
import { SlotsService_2024_09_04 } from "@/modules/slots/slots-2024-09-04/services/slots.service";
import { Query, Body, Controller, Get, Delete, Post, Param, Res, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";
import { Response as ExpressResponse } from "express";

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
  async reserveSlot(
    @Body() body: ReserveSlotInput_2024_09_04,
    @Cookies("uid") uidCookie: string | undefined,
    @Res({ passthrough: true }) response: ExpressResponse
  ): Promise<ReserveSlotOutput_2024_09_04> {
    const uid = await this.slotsService.reserveSlot(body, uidCookie);

    response.cookie("uid", uid);

    return {
      status: SUCCESS_STATUS,
      data: {
        uid,
      },
    };
  }

  @Get("/available")
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
  @HttpCode(HttpStatus.OK)
  async deleteSelectedSlot(@Param("uid") uid: string): Promise<ApiResponse> {
    await this.slotsService.deleteSelectedSlot(uid);

    return {
      status: SUCCESS_STATUS,
    };
  }
}
