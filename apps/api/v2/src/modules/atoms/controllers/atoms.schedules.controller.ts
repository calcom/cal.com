import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { GetAtomSchedulesQueryParams } from "@/modules/atoms/inputs/get-atom-schedules-query-params.input";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { UserWithProfile } from "@/modules/users/users.repository";
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  Version,
  VERSION_NEUTRAL,
} from "@nestjs/common";
import {
  ApiTags as DocsTags,
  ApiExcludeController as DocsExcludeController,
  ApiOperation,
} from "@nestjs/swagger";
import { z } from "zod";

import { SCHEDULE_READ, SCHEDULE_WRITE, SUCCESS_STATUS } from "@calcom/platform-constants";
import type {
  GetAvailabilityListHandlerReturn,
  DuplicateScheduleHandlerReturn,
} from "@calcom/platform-libraries/schedules";
import { getAvailabilityListHandler, duplicateScheduleHandler } from "@calcom/platform-libraries/schedules";
import type { CreateScheduleHandlerReturn, CreateScheduleSchema } from "@calcom/platform-libraries/schedules";
import { createScheduleHandler } from "@calcom/platform-libraries/schedules";
import { FindDetailedScheduleByIdReturnType } from "@calcom/platform-libraries/schedules";
import { ApiResponse, UpdateAtomScheduleDto } from "@calcom/platform-types";

import { SchedulesAtomsService } from "../services/schedules-atom.service";

/*
Endpoints used only by platform atoms, reusing code from other modules, data is already formatted and ready to be used by frontend atoms
these endpoints should not be recommended for use by third party and are excluded from docs
*/

@Controller({
  path: "/v2/atoms",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Atoms - endpoints for atoms")
@DocsExcludeController(true)
export class AtomsSchedulesController {
  constructor(private readonly schedulesService: SchedulesAtomsService) {}

  @Get("/schedules")
  @Version(VERSION_NEUTRAL)
  @UseGuards(ApiAuthGuard)
  @Permissions([SCHEDULE_READ])
  async getSchedule(
    @GetUser() user: UserWithProfile,
    @Query() queryParams: GetAtomSchedulesQueryParams
  ): Promise<ApiResponse<FindDetailedScheduleByIdReturnType | null>> {
    const { isManagedEventType, scheduleId } = queryParams;
    const schedule = await this.schedulesService.getSchedule({
      scheduleId,
      userId: user.id,
      timeZone: user.timeZone,
      isManagedEventType,
    });

    return {
      status: SUCCESS_STATUS,
      data: schedule,
    };
  }

  @Get("/schedules/all")
  @Version(VERSION_NEUTRAL)
  @UseGuards(ApiAuthGuard)
  @Permissions([SCHEDULE_READ])
  async getAllUserSchedules(
    @GetUser() user: UserWithProfile
  ): Promise<ApiResponse<Awaited<GetAvailabilityListHandlerReturn>>> {
    const userSchedules = await getAvailabilityListHandler({ ctx: { user } });

    return {
      status: SUCCESS_STATUS,
      data: userSchedules,
    };
  }

  @Patch("schedules/:scheduleId")
  @Permissions([SCHEDULE_WRITE])
  @UseGuards(ApiAuthGuard)
  @ApiOperation({ summary: "Update atom schedule" })
  async updateSchedule(
    @GetUser() user: UserWithProfile,
    @Body() bodySchedule: UpdateAtomScheduleDto,
    @Param("scheduleId", ParseIntPipe) scheduleId: number
  ): Promise<ApiResponse<any>> {
    const updatedSchedule = await this.schedulesService.updateUserSchedule({
      user,
      input: bodySchedule,
      scheduleId,
    });

    return {
      status: SUCCESS_STATUS,
      data: updatedSchedule,
    };
  }

  @Post("schedules/create")
  @Permissions([SCHEDULE_WRITE])
  @UseGuards(ApiAuthGuard)
  @ApiOperation({ summary: "Create atom schedule" })
  async createSchedule(
    @GetUser() user: UserWithProfile,
    @Body() bodySchedule: z.infer<typeof CreateScheduleSchema>
  ): Promise<ApiResponse<CreateScheduleHandlerReturn>> {
    const createdSchedule = await createScheduleHandler({ input: bodySchedule, ctx: { user } });

    return {
      status: SUCCESS_STATUS,
      data: createdSchedule,
    };
  }

  @Post("schedules/:scheduleId/duplicate")
  @Permissions([SCHEDULE_WRITE])
  @UseGuards(ApiAuthGuard)
  @ApiOperation({ summary: "Duplicate existing schedule" })
  async duplicateExistingSchedule(
    @GetUser() user: UserWithProfile,
    @Param("scheduleId", ParseIntPipe) scheduleId: number
  ): Promise<ApiResponse<Awaited<DuplicateScheduleHandlerReturn>>> {
    const duplicatedSchedule = await duplicateScheduleHandler({ ctx: { user }, input: { scheduleId } });

    return {
      status: SUCCESS_STATUS,
      data: duplicatedSchedule,
    };
  }
}
