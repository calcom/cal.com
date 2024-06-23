import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, ValidateNested, IsArray } from "class-validator";

class EventTypeModel_2024_04_15 {
  @IsInt()
  id!: number;

  @IsOptional()
  @IsString()
  eventName?: string | null;
}

class AvailabilityModel_2024_04_15 {
  @IsInt()
  id!: number;

  @IsOptional()
  @IsInt()
  userId?: number | null;

  @IsOptional()
  @IsInt()
  scheduleId?: number | null;

  @IsOptional()
  @IsInt()
  eventTypeId?: number | null;

  @IsArray()
  @IsInt({ each: true })
  days!: number[];

  @IsOptional()
  @Type(() => Date)
  @IsString() // Assuming date is serialized/deserialized appropriately
  startTime?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsString() // Assuming date is serialized/deserialized appropriately
  endTime?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsString() // Assuming date is serialized/deserialized appropriately
  date?: Date | null;
}

class ScheduleModel_2024_04_15 {
  @IsInt()
  id!: number;

  @IsInt()
  userId!: number;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  timeZone?: string | null;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => EventTypeModel_2024_04_15)
  @IsArray()
  eventType?: EventTypeModel_2024_04_15[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityModel_2024_04_15)
  @IsArray()
  availability?: AvailabilityModel_2024_04_15[];
}

export class UpdatedScheduleOutput_2024_04_15 {
  @ValidateNested()
  @Type(() => ScheduleModel_2024_04_15)
  schedule!: ScheduleModel_2024_04_15;

  @IsBoolean()
  isDefault!: boolean;

  @IsOptional()
  @IsString()
  timeZone?: string;

  @IsOptional()
  @IsInt()
  prevDefaultId?: number | null;

  @IsOptional()
  @IsInt()
  currentDefaultId?: number | null;
}
