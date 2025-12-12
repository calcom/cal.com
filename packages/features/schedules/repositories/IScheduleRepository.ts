import type { User } from "@calcom/prisma/client";

import type {
  ScheduleBasicDto,
  ScheduleCreateInputDto,
  ScheduleCreatedDto,
  ScheduleForBuildDateRangesDto,
  ScheduleForOwnershipCheckDto,
  UserDefaultScheduleDto,
} from "./dto/ScheduleDto";

export interface IScheduleRepository {
  findByIdForBuildDateRanges(args: { scheduleId: number }): Promise<ScheduleForBuildDateRangesDto | null>;

  findByIdForOwnershipCheck(args: { scheduleId: number }): Promise<ScheduleForOwnershipCheckDto | null>;

  findById(args: { id: number }): Promise<ScheduleBasicDto | null>;

  getDefaultScheduleId(userId: number): Promise<number>;

  hasDefaultSchedule(user: Partial<User>): Promise<boolean>;

  setupDefaultSchedule(userId: number, scheduleId: number): Promise<UserDefaultScheduleDto>;

  countByUserId(userId: number): Promise<number>;

  create(input: ScheduleCreateInputDto): Promise<ScheduleCreatedDto>;
}

export type {
  ScheduleBasicDto,
  ScheduleCreateInputDto,
  ScheduleCreatedDto,
  ScheduleForBuildDateRangesDto,
  ScheduleForOwnershipCheckDto,
  UserDefaultScheduleDto,
};
