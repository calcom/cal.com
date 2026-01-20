import { VERSION_2024_09_04 } from "@/lib/api-versions";
import { OPTIONAL_API_KEY_OR_ACCESS_TOKEN_HEADER, OPTIONAL_X_CAL_CLIENT_ID_HEADER } from "@/lib/docs/headers";
import {
  AuthOptionalUser,
  GetOptionalUser,
} from "@/modules/auth/decorators/get-optional-user/get-optional-user.decorator";
import { OptionalApiAuthGuard } from "@/modules/auth/guards/optional-api-auth/optional-api-auth.guard";
import { GetReservedSlotOutput_2024_09_04 } from "@/modules/slots/slots-2024-09-04/outputs/get-reserved-slot.output";
import { GetSlotsOutput_2024_09_04 } from "@/modules/slots/slots-2024-09-04/outputs/get-slots.output";
import { ReserveSlotOutputResponse_2024_09_04 } from "@/modules/slots/slots-2024-09-04/outputs/reserve-slot.output";
import { SlotsService_2024_09_04 } from "@/modules/slots/slots-2024-09-04/services/slots.service";
import {
  Query,
  Body,
  Controller,
  Get,
  Delete,
  Post,
  Param,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiTags as DocsTags,
  ApiHeader,
  ApiResponse as DocsResponse,
  ApiQuery,
} from "@nestjs/swagger";
import { plainToClass } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  GetSlotsInput_2024_09_04,
  GetSlotsInputPipe,
  ReserveSlotInput_2024_09_04,
  ReserveSlotOutput_2024_09_04 as ReserveSlotOutputType_2024_09_04,
  GetReservedSlotOutput_2024_09_04 as GetReservedSlotOutputType_2024_09_04,
} from "@calcom/platform-types";
import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "/v2/slots",
  version: VERSION_2024_09_04,
})
@DocsTags("Slots")
@ApiHeader({
  name: "cal-api-version",
  description: `Must be set to ${VERSION_2024_09_04}. If not set to this value, the endpoint will default to an older version.`,
  example: VERSION_2024_09_04,
  required: true,
  schema: {
    default: VERSION_2024_09_04,
  },
})
export class SlotsController_2024_09_04 {
  constructor(private readonly slotsService: SlotsService_2024_09_04) {}

  @Get("/")
  @ApiOperation({
    summary: "Get available time slots for an event type",
    description: `
      There are 4 ways to get available slots for event type of an individual user:

      1. By event type id. Example '/v2/slots?eventTypeId=10&start=2050-09-05&end=2050-09-06&timeZone=Europe/Rome'

      2. By event type slug + username. Example '/v2/slots?eventTypeSlug=intro&username=bob&start=2050-09-05&end=2050-09-06'

      3. By event type slug + username + organization slug when searching within an organization. Example '/v2/slots?organizationSlug=org-slug&eventTypeSlug=intro&username=bob&start=2050-09-05&end=2050-09-06'

      4. By usernames only (used for dynamic event type - there is no specific event but you want to know when 2 or more people are available). Example '/v2/slots?usernames=alice,bob&username=bob&organizationSlug=org-slug&start=2050-09-05&end=2050-09-06'. As you see you also need to provide the slug of the organization to which each user in the 'usernames' array belongs.

      And 3 ways to get available slots for team event type:

      1. By team event type id. Example '/v2/slots?eventTypeId=10&start=2050-09-05&end=2050-09-06&timeZone=Europe/Rome'.
         **Note for managed event types**: Managed event types are templates that create individual child event types for each team member. You cannot fetch slots for the parent managed event type directly. Instead, you must:
         - Find the child event type IDs (the ones assigned to specific users)
         - Use those child event type IDs to fetch slots as individual user event types using as described in the individual user section above.

      2. By team event type slug + team slug. Example '/v2/slots?eventTypeSlug=intro&teamSlug=team-slug&start=2050-09-05&end=2050-09-06'

      3. By team event type slug + team slug + organization slug when searching within an organization. Example '/v2/slots?organizationSlug=org-slug&eventTypeSlug=intro&teamSlug=team-slug&start=2050-09-05&end=2050-09-06'

      All of them require "start" and "end" query parameters which define the time range for which available slots should be checked.
      Optional parameters are:
      - timeZone: Time zone in which the available slots should be returned. Defaults to UTC.
      - duration: Only use for event types that allow multiple durations or for dynamic event types. If not passed for multiple duration event types defaults to default duration. For dynamic event types defaults to 30 aka each returned slot is 30 minutes long. So duration=60 means that returned slots will be each 60 minutes long.
      - format: Format of the slots. By default return is an object where each key is date and value is array of slots as string. If you want to get start and end of each slot use "range" as value.
      - bookingUidToReschedule: When rescheduling an existing booking, provide the booking's unique identifier to exclude its time slot from busy time calculations. This ensures the original booking time appears as available for rescheduling.

       <Note>Please make sure to pass in the cal-api-version header value as mentioned in the Headers section. Not passing the correct value will default to an older version of this endpoint.</Note>
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
    name: "format",
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
      "The slug of the event type for which available slots should be checked. If slug is provided then username or teamSlug must be provided too and if relevant organizationSlug too.",
    example: "event-type-slug",
  })
  @ApiQuery({
    name: "username",
    required: false,
    description:
      "The username of the user who owns event type with eventTypeSlug - used when slots are checked for individual user event type.",
    example: "bob",
  })
  @ApiQuery({
    name: "teamSlug",
    required: false,
    description:
      "The slug of the team who owns event type with eventTypeSlug - used when slots are checked for team event type.",
    example: "team-slug",
  })
  @ApiQuery({
    name: "organizationSlug",
    required: false,
    description:
      "The slug of the organization to which user with username belongs or team with teamSlug belongs.",
    example: "org-slug",
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
  @ApiQuery({
    name: "bookingUidToReschedule",
    required: false,
    description:
      "The unique identifier of the booking being rescheduled. When provided will ensure that the original booking time appears within the returned available slots when rescheduling.",
    example: "abc123def456",
  })
  @DocsResponse({
    status: 200,
    description: `A map of available slots indexed by date, where each date is associated with an array of time slots. If format=range is specified, each slot will be an object with start and end properties denoting start and end of the slot.
      For seated slots each object will have attendeesCount and bookingUid properties.
      If no slots are available, the data field will be an empty object {}.`,
    schema: {
      oneOf: [
        {
          type: "object",
          title: "Default format (or with format=time)",
          additionalProperties: {
            type: "array",
            items: { type: "string" },
          },
          example: {
            status: "success",
            data: {
              "2050-09-05": [
                { start: "2050-09-05T09:00:00.000+02:00" },
                { start: "2050-09-05T10:00:00.000+02:00" },
              ],
              "2050-09-06": [
                { start: "2050-09-06T09:00:00.000+02:00" },
                { start: "2050-09-06T10:00:00.000+02:00" },
              ],
            },
          },
        },
        {
          type: "object",
          title: "Range format (when format=range)",
          additionalProperties: {
            type: "array",
            items: {
              type: "object",
              properties: {
                start: { type: "string" },
                end: { type: "string" },
              },
            },
          },
          example: {
            status: "success",
            data: {
              "2050-09-05": [
                { start: "2050-09-05T09:00:00.000+02:00", end: "2050-09-05T10:00:00.000+02:00" },
                { start: "2050-09-05T10:00:00.000+02:00", end: "2050-09-05T11:00:00.000+02:00" },
              ],
              "2050-09-06": [
                { start: "2050-09-06T09:00:00.000+02:00", end: "2050-09-06T10:00:00.000+02:00" },
                { start: "2050-09-06T10:00:00.000+02:00", end: "2050-09-06T11:00:00.000+02:00" },
              ],
            },
          },
        },
      ],
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

  @Post("/reservations")
  @UseGuards(OptionalApiAuthGuard)
  @ApiOperation({
    summary: "Reserve a slot",
    description: `Make a slot not available for others to book for a certain period of time. If you authenticate using oAuth credentials, api key or access token
    then you can also specify custom duration for how long the slot should be reserved for (defaults to 5 minutes).
    
    <Note>Please make sure to pass in the cal-api-version header value as mentioned in the Headers section. Not passing the correct value will default to an older version of this endpoint.</Note>    
    `,
  })
  @ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
  @ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
  @ApiHeader(OPTIONAL_API_KEY_OR_ACCESS_TOKEN_HEADER)
  async reserveSlot(
    @Body() body: ReserveSlotInput_2024_09_04,
    @GetOptionalUser() user: AuthOptionalUser
  ): Promise<ReserveSlotOutputResponse_2024_09_04> {
    const reservedSlot = await this.slotsService.reserveSlot(body, user?.id);

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(ReserveSlotOutputType_2024_09_04, reservedSlot, {
        strategy: "excludeAll",
      }),
    };
  }

  @Get("/reservations/:uid")
  @ApiOperation({
    summary: "Get reserved slot",
    description: `<Note>Please make sure to pass in the cal-api-version header value as mentioned in the Headers section. Not passing the correct value will default to an older version of this endpoint.</Note>`,
  })
  async getReservedSlot(@Param("uid") uid: string): Promise<GetReservedSlotOutput_2024_09_04> {
    const reservedSlot = await this.slotsService.getReservedSlot(uid);

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(GetReservedSlotOutputType_2024_09_04, reservedSlot, {
        strategy: "excludeAll",
      }),
    };
  }

  @Patch("/reservations/:uid")
  @ApiOperation({
    summary: "Update a reserved slot",
    description: `<Note>Please make sure to pass in the cal-api-version header value as mentioned in the Headers section. Not passing the correct value will default to an older version of this endpoint.</Note>`,
  })
  @HttpCode(HttpStatus.OK)
  async updateReservedSlot(
    @Body() body: ReserveSlotInput_2024_09_04,
    @Param("uid") uid: string
  ): Promise<ReserveSlotOutputResponse_2024_09_04> {
    const reservedSlot = await this.slotsService.updateReservedSlot(body, uid);

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(ReserveSlotOutputType_2024_09_04, reservedSlot, {
        strategy: "excludeAll",
      }),
    };
  }

  @Delete("/reservations/:uid")
  @ApiOperation({
    summary: "Delete a reserved slot",
    description: `<Note>Please make sure to pass in the cal-api-version header value as mentioned in the Headers section. Not passing the correct value will default to an older version of this endpoint.</Note>`,
  })
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
  async deleteReservedSlot(@Param("uid") uid: string): Promise<ApiResponse> {
    await this.slotsService.deleteReservedSlot(uid);

    return {
      status: SUCCESS_STATUS,
    };
  }
}
