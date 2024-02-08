import { UpdateScheduleInput } from "@/ee/schedules/inputs/update-schedule.input";
import { SchedulesRepository } from "@/ee/schedules/schedules.repository";
import { ResponseService } from "@/ee/schedules/services/response/response.service";
import { ScheduleResponse } from "@/ee/schedules/services/response/zod/response";
import { SchedulesService } from "@/ee/schedules/services/schedules.service";
import { ForAtom } from "@/lib/atoms/decorators/for-atom.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
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
import { User } from "@prisma/client";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ScheduleWithAvailabilitiesForWeb } from "@calcom/platform-libraries";
import { ApiResponse } from "@calcom/platform-types";

import { CreateScheduleInput } from "../inputs/create-schedule.input";

@Controller({
  path: "schedules",
  version: "2",
})
@UseGuards(AccessTokenGuard)
export class SchedulesController {
  constructor(
    private readonly schedulesService: SchedulesService,
    private readonly schedulesRepository: SchedulesRepository,
    private readonly schedulesResponseService: ResponseService
  ) {}

  @Post("/")
  async createSchedule(
    @GetUser() user: User,
    @Body() bodySchedule: CreateScheduleInput,
    @ForAtom() forAtom: boolean
  ): Promise<ApiResponse<{ schedule: ScheduleResponse | ScheduleWithAvailabilitiesForWeb }>> {
    const schedule = await this.schedulesService.createUserSchedule(user.id, bodySchedule);
    const scheduleFormatted = await this.schedulesResponseService.formatSchedule(forAtom, user, schedule);

    return {
      status: SUCCESS_STATUS,
      data: {
        schedule: scheduleFormatted,
      },
    };
  }

  @Get("/default")
  async getDefaultSchedule(
    @GetUser() user: User,
    @ForAtom() forAtom: boolean
  ): Promise<ApiResponse<{ schedule: ScheduleResponse | ScheduleWithAvailabilitiesForWeb }>> {
    const schedule = await this.schedulesService.getUserScheduleDefault(user.id);
    const scheduleFormatted = await this.schedulesResponseService.formatSchedule(forAtom, user, schedule);

    return {
      status: SUCCESS_STATUS,
      data: {
        schedule: scheduleFormatted,
      },
    };
  }

  @Get("/:scheduleId")
  async getSchedule(
    @GetUser() user: User,
    @Param("scheduleId") scheduleId: number,
    @ForAtom() forAtom: boolean
  ): Promise<ApiResponse<{ schedule: ScheduleResponse | ScheduleWithAvailabilitiesForWeb }>> {
    const schedule = await this.schedulesService.getUserSchedule(user.id, scheduleId);
    const scheduleFormatted = await this.schedulesResponseService.formatSchedule(forAtom, user, schedule);

    return {
      status: SUCCESS_STATUS,
      data: {
        schedule: scheduleFormatted,
      },
    };
  }

  @Get("/")
  async getSchedules(
    @GetUser() user: User,
    @ForAtom() forAtom: boolean
  ): Promise<ApiResponse<{ schedules: ScheduleResponse[] | ScheduleWithAvailabilitiesForWeb[] }>> {
    const schedules = await this.schedulesService.getUserSchedules(user.id);
    const schedulesFormatted = await this.schedulesResponseService.formatSchedules(forAtom, user, schedules);

    return {
      status: SUCCESS_STATUS,
      data: {
        schedules: schedulesFormatted,
      },
    };
  }

  @Patch("/:scheduleId")
  async updateSchedule(
    @GetUser() user: User,
    @Param("scheduleId") scheduleId: number,
    @Body() bodySchedule: UpdateScheduleInput,
    @ForAtom() forAtom: boolean
  ): Promise<ApiResponse<{ schedule: ScheduleResponse | ScheduleWithAvailabilitiesForWeb }>> {
    const schedule = await this.schedulesService.updateUserSchedule(user.id, scheduleId, bodySchedule);
    const scheduleFormatted = await this.schedulesResponseService.formatSchedule(forAtom, user, schedule);

    return {
      status: SUCCESS_STATUS,
      data: {
        schedule: scheduleFormatted,
      },
    };
  }

  @Delete("/:scheduleId")
  @HttpCode(HttpStatus.OK)
  async deleteSchedule(
    @GetUser("id") userId: number,
    @Param("scheduleId") scheduleId: number
  ): Promise<ApiResponse> {
    await this.schedulesService.deleteUserSchedule(userId, scheduleId);

    return {
      status: SUCCESS_STATUS,
    };
  }
}
