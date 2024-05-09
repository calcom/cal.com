import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, ValidateNested, IsArray } from "class-validator";

class EventTypeModel {
  @IsInt()
  id!: number;

  @IsOptional()
  @IsString()
  eventName?: string | null;
}

class AvailabilityModel {
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

class ScheduleModel {
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
  @Type(() => EventTypeModel)
  @IsArray()
  eventType?: EventTypeModel[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityModel)
  @IsArray()
  availability?: AvailabilityModel[];
}

export class UpdatedScheduleOutput {
  @ValidateNested()
  @Type(() => ScheduleModel)
  schedule!: ScheduleModel;

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
