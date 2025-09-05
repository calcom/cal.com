import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { GetAvailableSlotsInput_2024_09_04 } from "@calcom/platform-types";
import { Controller, HttpCode, HttpStatus, Param, Post, Query, Req } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_HEADER } from "@/lib/docs/headers";
import { ResponseSlotsOutput } from "@/modules/routing-forms/outputs/response-slots.output";
import { RoutingFormsService } from "@/modules/routing-forms/services/routing-forms.service";

@Controller({
  path: "/v2/routing-forms/:routingFormId",
  version: API_VERSIONS_VALUES,
})
@ApiTags("Routing forms")
@ApiHeader(API_KEY_HEADER)
export class RoutingFormsController {
  constructor(private readonly routingFormsService: RoutingFormsService) {}

  @Post("/calculate-slots")
  @ApiOperation({
    summary: "Calculate slots based on routing form response",
    description:
      "It will not actually save the response just return the routed event type and slots when it can be booked.",
  })
  @HttpCode(HttpStatus.OK)
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
