import { Type } from "class-transformer";
import { IsDate, IsOptional, IsArray, IsBoolean, IsInt, IsString, ValidateNested } from "class-validator";

class AvailabilityModel {
  @IsInt()
  id!: number;

  @IsOptional()
  @IsInt()
  userId?: number | null;

  @IsOptional()
  @IsInt()
  eventTypeId?: number | null;

  @IsArray()
  @IsInt({ each: true })
  days!: number[];

  @IsDate()
  @Type(() => Date)
  startTime!: Date;

  @IsDate()
  @Type(() => Date)
  endTime!: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  date?: Date | null;

  @IsOptional()
  @IsInt()
  scheduleId?: number | null;
}

class WorkingHours {
  @IsArray()
  @IsInt({ each: true })
  days!: number[];

  @IsInt()
  startTime!: number;

  @IsInt()
  endTime!: number;

  @IsOptional()
  @IsInt()
  userId?: number | null;
}

class TimeRange {
  @IsOptional()
  @IsInt()
  userId?: number | null;

  @IsDate()
  start!: Date;

  @IsDate()
  end!: Date;
}

export class ScheduleOutput {
  @IsInt()
  id!: number;

  @IsString()
  name!: string;

  @IsBoolean()
  isManaged!: boolean;

  @ValidateNested({ each: true })
  @Type(() => WorkingHours)
  workingHours!: WorkingHours[];

  @ValidateNested({ each: true })
  @Type(() => AvailabilityModel)
  @IsArray()
  schedule!: AvailabilityModel[];

  availability!: TimeRange[][];

  @IsString()
  timeZone!: string;

  @ValidateNested({ each: true })
  @IsArray()
  // note(Lauris) it should be
  // dateOverrides!: { ranges: TimeRange[] }[];
  // but docs aren't generating correctly it results in array of strings
  dateOverrides!: unknown[];

  @IsBoolean()
  isDefault!: boolean;

  @IsBoolean()
  isLastSchedule!: boolean;

  @IsBoolean()
  readOnly!: boolean;
}
