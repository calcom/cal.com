import { VERSION_2024_04_15 } from "@/lib/api-versions";
import { SlotsService_2024_04_15 } from "@/modules/slots/slots-2024-04-15/services/slots.service";
import { Query, Body, Controller, Get, Delete, Post, Req, Res } from "@nestjs/common";
import { ApiTags as DocsTags, ApiExcludeController as DocsExcludeController } from "@nestjs/swagger";
import { Response as ExpressResponse, Request as ExpressRequest } from "express";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { getAvailableSlots } from "@calcom/platform-libraries";
import type { AvailableSlotsType } from "@calcom/platform-libraries";
import { RemoveSelectedSlotInput_2024_04_15, ReserveSlotInput_2024_04_15 } from "@calcom/platform-types";
import { ApiResponse, GetAvailableSlotsInput_2024_04_15 } from "@calcom/platform-types";

@Controller({
  path: "/v2/slots",
  version: VERSION_2024_04_15,
})
@DocsExcludeController(true)
export class SlotsController_2024_04_15 {
  constructor(private readonly slotsService: SlotsService_2024_04_15) {}

  @Post("/reserve")
  async reserveSlot(
    @Body() body: ReserveSlotInput_2024_04_15,
    @Res({ passthrough: true }) res: ExpressResponse,
    @Req() req: ExpressRequest
  ): Promise<ApiResponse<string>> {
    const uid = await this.slotsService.reserveSlot(body, req.cookies?.uid);

    res.cookie("uid", uid);
    return {
      status: SUCCESS_STATUS,
      data: uid,
    };
  }

  @Delete("/selected-slot")
  async deleteSelectedSlot(
    @Query() params: RemoveSelectedSlotInput_2024_04_15,
    @Req() req: ExpressRequest
  ): Promise<ApiResponse> {
    const uid = req.cookies?.uid || params.uid;

    await this.slotsService.deleteSelectedslot(uid);

    return {
      status: SUCCESS_STATUS,
    };
  }

  @Get("/available")
  async getAvailableSlots(
    @Query() query: GetAvailableSlotsInput_2024_04_15,
    @Req() req: ExpressRequest
  ): Promise<ApiResponse<AvailableSlotsType>> {
    const isTeamEvent = await this.slotsService.checkIfIsTeamEvent(query.eventTypeId);
    const availableSlots = await getAvailableSlots({
      input: {
        ...query,
        isTeamEvent,
      },
      ctx: {
        req,
      },
    });

    return {
      data: availableSlots,
      status: SUCCESS_STATUS,
    };
  }
}
