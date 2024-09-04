import { VERSION_2024_09_04 } from "@/lib/api-versions";
import { SlotsService_2024_04_15 } from "@/modules/slots/slots-2024-04-15/services/slots.service";
import { GetSlotsOutput_2024_09_04 } from "@/modules/slots/slots-2024-09-04/outputs/get-slots.output";
import { ReserveSlotOutput_2024_09_04 } from "@/modules/slots/slots-2024-09-04/outputs/reserve-slot.output";
import { Query, Body, Controller, Get, Delete, Post, Req, Res, Param } from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";
import { Response as ExpressResponse, Request as ExpressRequest } from "express";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { getAvailableSlots } from "@calcom/platform-libraries";
import type { AvailableSlotsType } from "@calcom/platform-libraries";
import {
  GetSlotsInput_2024_09_04,
  GetSlotsInputPipe,
  ReserveSlotInput_2024_04_15,
} from "@calcom/platform-types";
import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "/v2/slots",
  version: VERSION_2024_09_04,
})
@DocsTags("Slots")
export class SlotsController_2024_09_04 {
  constructor(private readonly slotsService: SlotsService_2024_04_15) {}

  @Post("/")
  async reserveSlot(
    @Body() body: ReserveSlotInput_2024_04_15,
    @Res({ passthrough: true }) res: ExpressResponse,
    @Req() req: ExpressRequest
  ): Promise<ReserveSlotOutput_2024_09_04> {
    const uid = await this.slotsService.reserveSlot(body, req.cookies?.uid);

    res.cookie("uid", uid);
    return {
      status: SUCCESS_STATUS,
      data: {
        uid,
      },
    };
  }

  @Delete("/:uid")
  async deleteSelectedSlot(@Param("uid") uid: string): Promise<ApiResponse> {
    await this.slotsService.deleteSelectedslot(uid);

    return {
      status: SUCCESS_STATUS,
    };
  }

  @Get("/")
  async getAvailableSlots(
    @Query(new GetSlotsInputPipe()) query: GetSlotsInput_2024_09_04,
    @Req() req: ExpressRequest
  ): Promise<GetSlotsOutput_2024_09_04> {
    // const isTeamEvent = await this.slotsService.checkIfIsTeamEvent(query.eventTypeId);
    // const availableSlots = await getAvailableSlots({
    //   input: {
    //     ...query,
    //     isTeamEvent,
    //   },
    //   ctx: {
    //     req,
    //   },
    // });

    return {
      data: {},
      status: SUCCESS_STATUS,
    };
  }
}
