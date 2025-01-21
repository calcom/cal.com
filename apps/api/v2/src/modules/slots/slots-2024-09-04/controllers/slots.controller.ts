import { VERSION_2024_09_04 } from "@/lib/api-versions";
import { Cookies } from "@/lib/decorators/cookies.decorator";
import { GetSlotsOutput_2024_09_04 } from "@/modules/slots/slots-2024-09-04/outputs/get-slots.output";
import { ReserveSlotOutput_2024_09_04 } from "@/modules/slots/slots-2024-09-04/outputs/reserve-slot.output";
import { SlotsService_2024_09_04 } from "@/modules/slots/slots-2024-09-04/services/slots.service";
import { Query, Body, Controller, Get, Delete, Post, Param, Res, HttpCode, HttpStatus } from "@nestjs/common";
import {
  ApiOperation,
  ApiTags as DocsTags,
  ApiHeader,
  ApiResponse as DocsResponse,
  ApiQuery,
} from "@nestjs/swagger";
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
@ApiHeader({
  name: "cal-api-version",
  description: `Must be set to \`2024-09-04\``,
  required: true,
})
export class SlotsController_2024_09_04 {
  constructor(private readonly slotsService: SlotsService_2024_09_04) {}

  @Post("/")
  @ApiOperation({
    summary: "Reserve a slot",
    description: "Prevent double booking by reserving a slot.",
  })
  async reserveSlot(
    @Body() body: ReserveSlotInput_2024_09_04,
    @Cookies("uid") uidCookie: string | undefined,
    @Res({ passthrough: true }) response: ExpressResponse
  ): Promise<ReserveSlotOutput_2024_09_04> {
    const reservedSlot = await this.slotsService.reserveSlot(body, uidCookie);

    response.cookie("uid", reservedSlot.reservationUid);

    return {
      status: SUCCESS_STATUS,
      data: reservedSlot,
    };
  }

  @Get("/available")
  @ApiOperation({
    summary: "Get available slots",
    description: `
      There are 3 ways to get available slots:
      
      1. By event type id: schema ById_2024_09_04. Example '/api/v2/slots/available?eventTypeId=10&start=2050-09-05&end=2050-09-06&timeZone=Europe/Rome'

      2. By event type slug: schema BySlug_2024_09_04. Example '/api/v2/slots/available?eventTypeSlug=intro&start=2050-09-05&end=2050-09-06'

      3. By usernames: schema ByUsernames_2024_09_04. Example '/api/v2/slots/available?usernames=alice,bob&start=2050-09-05&end=2050-09-06&duration=60'

      All of them require "start" and "end" query parameters which define the time range for which available slots should be checked,
      and "eventTypeId", "eventTypeSlug" or "usernames" query parameters to specify the event type or users for which available slots should be checked.
      `,
  })
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
  @DocsResponse({
    status: 200,
    description:
      "A map of available slots indexed by date, where each date is associated with an array of time slots. If you pass query parameter `format=range` then each slot will be an object with `start` and `end` properties denoting start and end of the slot.",
    schema: {
      type: "object",
      additionalProperties: {
        type: "array",
        items: { type: "string" },
      },
      example: {
        status: "success",
        data: {
          "2050-09-05": [
            "2050-09-05T09:00:00.000+02:00",
            "2050-09-05T10:00:00.000+02:00",
            "2050-09-05T11:00:00.000+02:00",
          ],
          "2050-09-06": [
            "2050-09-06T09:00:00.000+02:00",
            "2050-09-06T10:00:00.000+02:00",
            "2050-09-06T11:00:00.000+02:00",
          ],
        },
      },
    },
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

  @Delete("/:uid")
  @HttpCode(HttpStatus.OK)
  @DocsResponse({
    status: 200,
    schema: {
      type: "object",
      example: {
        status: "success",
      },
    },
  })
  async deleteSelectedSlot(@Param("uid") uid: string): Promise<ApiResponse> {
    await this.slotsService.deleteSelectedSlot(uid);

    return {
      status: SUCCESS_STATUS,
    };
  }
}
