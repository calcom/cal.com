import { SchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/schedules.service";
import { VERSION_2024_06_14, VERSION_2024_06_11 } from "@/lib/api-versions";
import { API_KEY_OR_ACCESS_TOKEN_HEADER } from "@/lib/docs/headers";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { UserWithProfile } from "@/modules/users/users.repository";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiResponse, ApiTags as DocsTags } from "@nestjs/swagger";

import { SCHEDULE_READ, SCHEDULE_WRITE, SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  CreateScheduleOutput_2024_06_11,
  CreateScheduleInput_2024_06_11,
  UpdateScheduleInput_2024_06_11,
  GetScheduleOutput_2024_06_11,
  UpdateScheduleOutput_2024_06_11,
  GetDefaultScheduleOutput_2024_06_11,
  DeleteScheduleOutput_2024_06_11,
  GetSchedulesOutput_2024_06_11,
} from "@calcom/platform-types";

@Controller({
  path: "/v2/schedules",
  version: [VERSION_2024_06_14, VERSION_2024_06_11],
})
@UseGuards(ApiAuthGuard, PermissionsGuard)
@DocsTags("Schedules")
@ApiHeader({
  name: "cal-api-version",
  description: `Must be set to ${VERSION_2024_06_11}. If not set to this value, the endpoint will default to an older version.`,
  example: VERSION_2024_06_11,
  required: true,
  schema: {
    default: VERSION_2024_06_11,
  },
})
@ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
export class SchedulesController_2024_06_11 {
  constructor(private readonly schedulesService: SchedulesService_2024_06_11) {}

  @Post("/")
  @Permissions([SCHEDULE_WRITE])
  @ApiOperation({
    summary: "Create a schedule",
    description: `
      Create a schedule for the authenticated user.

      The point of creating schedules is for event types to be available at specific times.

      The first goal of schedules is to have a default schedule. If you are platform customer and created managed users, then it is important to note that each managed user should have a default schedule.
      1. If you passed \`timeZone\` when creating managed user, then the default schedule from Monday to Friday from 9AM to 5PM will be created with that timezone. The managed user can then change the default schedule via the \`AvailabilitySettings\` atom.
      2. If you did not, then we assume you want the user to have this specific schedule right away. You should create a default schedule by specifying
      \`"isDefault": true\` in the request body. Until the user has a default schedule the user can't be booked nor manage their schedule via the AvailabilitySettings atom.

      The second goal of schedules is to create another schedule that event types can point to. This is useful for when an event is booked because availability is not checked against the default schedule but instead against that specific schedule.
      After creating a non-default schedule, you can update an event type to point to that schedule via the PATCH \`event-types/{eventTypeId}\` endpoint.

      When specifying start time and end time for each day use the 24 hour format e.g. 08:00, 15:00 etc.

      <Note>Please make sure to pass in the cal-api-version header value as mentioned in the Headers section. Not passing the correct value will default to an older version of this endpoint.</Note>
      `,
  })
  async createSchedule(
    @GetUser() user: UserWithProfile,
    @Body() bodySchedule: CreateScheduleInput_2024_06_11
  ): Promise<CreateScheduleOutput_2024_06_11> {
    const schedule = await this.schedulesService.createUserSchedule(user.id, bodySchedule);

    return {
      status: SUCCESS_STATUS,
      data: schedule,
    };
  }

  @Get("/default")
  @Permissions([SCHEDULE_READ])
  @ApiResponse({
    status: 200,
    type: GetDefaultScheduleOutput_2024_06_11,
  })
  @ApiOperation({
    summary: "Get default schedule",
    description: `Get the default schedule of the authenticated user.
    
    <Note>Please make sure to pass in the cal-api-version header value as mentioned in the Headers section. Not passing the correct value will default to an older version of this endpoint.</Note>
    `,
  })
  async getDefaultSchedule(@GetUser() user: UserWithProfile): Promise<GetScheduleOutput_2024_06_11> {
    const schedule = await this.schedulesService.getUserScheduleDefault(user.id);

    return {
      status: SUCCESS_STATUS,
      data: schedule,
    };
  }

  @Get("/:scheduleId")
  @Permissions([SCHEDULE_READ])
  @ApiOperation({
    summary: "Get a schedule",
    description: `<Note>Please make sure to pass in the cal-api-version header value as mentioned in the Headers section. Not passing the correct value will default to an older version of this endpoint.</Note>`,
  })
  async getSchedule(
    @GetUser() user: UserWithProfile,
    @Param("scheduleId") scheduleId: number
  ): Promise<GetScheduleOutput_2024_06_11> {
    const schedule = await this.schedulesService.getUserSchedule(user.id, scheduleId);

    return {
      status: SUCCESS_STATUS,
      data: schedule,
    };
  }

  @Get("/")
  @Permissions([SCHEDULE_READ])
  @ApiOperation({
    summary: "Get all schedules",
    description: `Get all schedules of the authenticated user.
    
     <Note>Please make sure to pass in the cal-api-version header value as mentioned in the Headers section. Not passing the correct value will default to an older version of this endpoint.</Note>
    `,
  })
  async getSchedules(@GetUser() user: UserWithProfile): Promise<GetSchedulesOutput_2024_06_11> {
    const schedules = await this.schedulesService.getUserSchedules(user.id);

    return {
      status: SUCCESS_STATUS,
      data: schedules,
    };
  }

  @Patch("/:scheduleId")
  @Permissions([SCHEDULE_WRITE])
  @ApiOperation({
    summary: "Update a schedule",
    description: `<Note>Please make sure to pass in the cal-api-version header value as mentioned in the Headers section. Not passing the correct value will default to an older version of this endpoint.</Note>`,
  })
  async updateSchedule(
    @GetUser() user: UserWithProfile,
    @Body() bodySchedule: UpdateScheduleInput_2024_06_11,
    @Param("scheduleId") scheduleId: string
  ): Promise<UpdateScheduleOutput_2024_06_11> {
    const updatedSchedule = await this.schedulesService.updateUserSchedule(
      user.id,
      Number(scheduleId),
      bodySchedule
    );

    return {
      status: SUCCESS_STATUS,
      data: updatedSchedule,
    };
  }

  @Delete("/:scheduleId")
  @HttpCode(HttpStatus.OK)
  @Permissions([SCHEDULE_WRITE])
  @ApiOperation({
    summary: "Delete a schedule",
    description: `<Note>Please make sure to pass in the cal-api-version header value as mentioned in the Headers section. Not passing the correct value will default to an older version of this endpoint.</Note>`,
  })
  async deleteSchedule(
    @GetUser("id") userId: number,
    @Param("scheduleId") scheduleId: number
  ): Promise<DeleteScheduleOutput_2024_06_11> {
    await this.schedulesService.deleteUserSchedule(userId, scheduleId);

    return {
      status: SUCCESS_STATUS,
    };
  }
}
