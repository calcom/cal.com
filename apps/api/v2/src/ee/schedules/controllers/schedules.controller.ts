import { UpdateScheduleInput } from "@/ee/schedules/inputs/update-schedule.input";
import { SchedulesService } from "@/ee/schedules/services/schedules.service";
import { schemaScheduleResponse } from "@/ee/schedules/zod/response/response";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from "@nestjs/common";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiResponse } from "@calcom/platform-types";

import { CreateScheduleInput } from "../inputs/create-schedule.input";

@Controller({
  path: "schedules",
  version: "2",
})
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post("/")
  @UseGuards(AccessTokenGuard)
  async createSchedule(
    @GetUser("id") userId: number,
    @Body() bodySchedule: CreateScheduleInput
  ): Promise<ApiResponse> {
    const schedule = await this.schedulesService.createUserSchedule(userId, bodySchedule);
    const scheduleResponse = schemaScheduleResponse.parse(schedule);

    return {
      status: SUCCESS_STATUS,
      data: {
        schedule: scheduleResponse,
      },
    };
  }

  @Get("/default")
  @UseGuards(AccessTokenGuard)
  async getDefaultSchedule(@GetUser("id") userId: number): Promise<ApiResponse> {
    const schedule = await this.schedulesService.getUserScheduleDefault(userId);
    const scheduleResponse = schemaScheduleResponse.parse(schedule);

    return {
      status: SUCCESS_STATUS,
      data: {
        schedule: scheduleResponse,
      },
    };
  }

  @Get("/:scheduleId")
  @UseGuards(AccessTokenGuard)
  async getSchedule(
    @GetUser("id") userId: number,
    @Param("scheduleId") scheduleId: number
  ): Promise<ApiResponse> {
    const schedule = await this.schedulesService.getUserSchedule(userId, scheduleId);
    const scheduleResponse = schemaScheduleResponse.parse(schedule);

    return {
      status: SUCCESS_STATUS,
      data: {
        schedule: scheduleResponse,
      },
    };
  }

  @Get("/")
  @UseGuards(AccessTokenGuard)
  async getSchedules(@GetUser("id") userId: number): Promise<ApiResponse> {
    const schedules = await this.schedulesService.getUserSchedules(userId);
    const schedulesResponse = schedules.map((schedule) => schemaScheduleResponse.parse(schedule));

    return {
      status: SUCCESS_STATUS,
      data: {
        schedules: schedulesResponse,
      },
    };
  }

  @Delete("/:scheduleId")
  @UseGuards(AccessTokenGuard)
  async deleteSchedule(
    @GetUser("id") userId: number,
    @Param("scheduleId") scheduleId: number
  ): Promise<ApiResponse> {
    await this.schedulesService.deleteUserSchedule(userId, scheduleId);

    return {
      status: SUCCESS_STATUS,
    };
  }

  @Put("/:scheduleId")
  @UseGuards(AccessTokenGuard)
  async updateSchedule(
    @GetUser("id") userId: number,
    @Param("scheduleId") scheduleId: number,
    @Body() bodySchedule: UpdateScheduleInput
  ): Promise<ApiResponse> {
    const schedule = await this.schedulesService.updateUserSchedule(userId, scheduleId, bodySchedule);
    const scheduleResponse = schemaScheduleResponse.parse(schedule);

    return {
      status: SUCCESS_STATUS,
      data: {
        schedule: scheduleResponse,
      },
    };
  }
}
