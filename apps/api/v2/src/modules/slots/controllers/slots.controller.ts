import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { SlotsService } from "@/modules/slots/services/slots.service";
import { Query, Body, Controller, Get, Delete, Post, Req, Res } from "@nestjs/common";
import { ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { Response as ExpressResponse, Request as ExpressRequest } from "express";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { getAvailableSlots } from "@calcom/platform-libraries";
import type { AvailableSlotsType } from "@calcom/platform-libraries";
import { RemoveSelectedSlotInput, ReserveSlotInput } from "@calcom/platform-types";
import { ApiResponse, GetAvailableSlotsInput } from "@calcom/platform-types";

@Controller({
  path: "/v2/slots",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Slots")
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  @Post("/reserve")
  @ApiOperation({ summary: "Reserve a slot" })
  async reserveSlot(
    @Body() body: ReserveSlotInput,
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
  @ApiOperation({ summary: "Delete a selected slot" })
  async deleteSelectedSlot(
    @Query() params: RemoveSelectedSlotInput,
    @Req() req: ExpressRequest
  ): Promise<ApiResponse> {
    const uid = req.cookies?.uid || params.uid;

    await this.slotsService.deleteSelectedslot(uid);

    return {
      status: SUCCESS_STATUS,
    };
  }

  @Get("/available")
  @ApiOperation({ summary: "Get available slots" })
  async getAvailableSlots(
    @Query() query: GetAvailableSlotsInput,
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
