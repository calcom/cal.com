import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
import { ReserveSlotInput } from "@/modules/slots/inputs/reserve-slot.input";
import { SlotsService } from "@/modules/slots/services/slots.service";
import { Body, Controller, Post, Req, Res, UseGuards } from "@nestjs/common";
import { Response as ExpressResponse, Request as ExpressRequest } from "express";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "slots",
  version: "2",
})
@UseGuards(AccessTokenGuard)
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  @Post("/reserve")
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
}
