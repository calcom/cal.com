import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_HEADER } from "@/lib/docs/headers";
import { ResponseSlotsOutput } from "@/modules/routing-forms/outputs/response-slots.output";
import { RoutingFormsService } from "@/modules/routing-forms/services/routing-forms.service";
import { Controller, Get, Param, Query, Req } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Request } from "express";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { GetAvailableSlotsInput_2024_09_04 } from "@calcom/platform-types";

@Controller({
  path: "/v2/routing-forms/:routingFormId",
  version: API_VERSIONS_VALUES,
})
@ApiTags("Routing forms")
@ApiHeader(API_KEY_HEADER)
export class RoutingFormsController {
  constructor(private readonly routingFormsService: RoutingFormsService) {}

  @Get()
  @ApiOperation({ summary: "Calculate slots based on routing form response" })
  async calculateSlotsBasedOnRoutingFormResponse(
    @Req() request: Request,
    @Query() query: GetAvailableSlotsInput_2024_09_04,
    @Param("routingFormId") routingFormId: string
  ): Promise<ResponseSlotsOutput> {
    const responseSlots = await this.routingFormsService.calculateSlotsBasedOnRoutingFormResponse(
      request,
      routingFormId,
      query
    );

    return {
      status: SUCCESS_STATUS,
      data: responseSlots,
    };
  }
}
