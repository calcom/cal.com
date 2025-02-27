import { GetSlotsOutput_2024_09_04 } from "@/modules/slots/outputs/get-slots.output";
import { Body, Controller, Delete, Get, Post, Query, Req, Res } from "@nestjs/common";
import { ApiQuery, ApiTags as DocsTags } from "@nestjs/swagger";
import { Request as ExpressRequest, Response as ExpressResponse } from "express";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiResponse, RemoveSelectedSlotInput, ReserveSlotInput } from "@calcom/platform-types";

import { API_VERSIONS_VALUES } from "../../../lib/api-versions";
import { SlotsService } from "../../slots/services/slots.service";
import { GetSlotsInput_2024_09_04, GetSlotsInputPipe } from "../inputs/get-slots-input.pipe";

@Controller({
  path: "/v2/slots",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Slots")
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

  @Get("/")
  @ApiQuery({
    name: "timeZone",
    required: false,
    description: "Time zone in which the available slots should be returned. Defaults to UTC.",
    example: "Europe/Rome",
  })
  @ApiQuery({
    name: "duration",
    required: false,
    description:
      "If event type has multiple possible durations then you can specify the desired duration here. Also, if you are fetching slots for a dynamic event then you can specify the duration her which defaults to 30, meaning that returned slots will be each 30 minutes long.",
    example: "60",
  })
  @ApiQuery({
    name: "slotFormat",
    required: false,
    description:
      "Format of slot times in response. Use 'range' to get start and end times. Use 'time' or omit this query parameter to get only start time.",
    example: "range",
  })
  @ApiQuery({
    name: "usernames",
    required: false,
    description: `The usernames for which available slots should be checked separated by a comma.
    
    Checking slots by usernames is used mainly for dynamic events where there is no specific event but we just want to know when 2 or more people are available.
    
    Must contain at least 2 usernames.`,
    example: "alice,bob",
  })
  @ApiQuery({
    name: "eventTypeId",
    required: false,
    description: "The ID of the event type for which available slots should be checked.",
    example: "100",
  })
  @ApiQuery({
    name: "eventTypeSlug",
    required: false,
    description:
      "The slug of the event type for which available slots should be checked. If slug is provided then username must be provided too.",
    example: "event-type-slug",
  })
  @ApiQuery({
    name: "username",
    required: false,
    description: "The username of the user to get event types for.",
    example: "bob",
  })
  @ApiQuery({
    name: "end",
    required: true,
    description: `
    Time until which available slots should be checked.
    
    Must be in UTC timezone as ISO 8601 datestring.
    
    You can pass date without hours which defaults to end of day or specify hours:
    2024-08-20 (will have hours 23:59:59 aka at the very end of the date) or you can specify hours manually like 2024-08-20T18:00:00Z.`,
    example: "2050-09-06",
  })
  @ApiQuery({
    name: "start",
    required: true,
    description: `
      Time starting from which available slots should be checked.
    
      Must be in UTC timezone as ISO 8601 datestring.
      
      You can pass date without hours which defaults to start of day or specify hours:
      2024-08-13 (will have hours 00:00:00 aka at very beginning of the date) or you can specify hours manually like 2024-08-13T09:00:00Z.`,
    example: "2050-09-05",
  })
  async getAvailableSlots(
    @Query(new GetSlotsInputPipe()) query: GetSlotsInput_2024_09_04
  ): Promise<GetSlotsOutput_2024_09_04> {
    const slots = await this.slotsService.getAvailableSlots(query);

    return {
      data: slots,
      status: SUCCESS_STATUS,
    };
  }

  @Delete("/selected-slot")
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
}
