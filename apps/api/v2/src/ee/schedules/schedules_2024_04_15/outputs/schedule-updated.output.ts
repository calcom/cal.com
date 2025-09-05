import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, ValidateNested } from "class-validator";

class EventTypeModel_2024_04_15 {
  @IsInt()
  @ApiProperty()
  id!: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: String, nullable: true })
  eventName?: string | null;
}

class AvailabilityModel_2024_04_15 {
  @IsInt()
  @ApiProperty()
  id!: number;

  @IsOptional()
  @IsInt()
  @ApiPropertyOptional({ type: Number, nullable: true })
  userId?: number | null;

  @IsOptional()
  @IsInt()
  @ApiPropertyOptional({ type: Number, nullable: true })
  scheduleId?: number | null;

  @IsOptional()
  @IsInt()
  @ApiPropertyOptional({ type: Number, nullable: true })
  eventTypeId?: number | null;

  @IsArray()
  @IsInt({ each: true })
  @ApiProperty({ type: [Number] })
  days!: number[];

  @IsOptional()
  @Type(() => Date)
  @IsString()
  @ApiPropertyOptional()
  startTime?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsString()
  @ApiPropertyOptional()
  endTime?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsString()
  @ApiPropertyOptional({ type: String, nullable: true })
  date?: Date | null;
}

class ScheduleModel_2024_04_15 {
  @IsInt()
  @ApiProperty()
  id!: number;

  @IsInt()
  @ApiProperty()
  userId!: number;

  @IsString()
  @ApiProperty()
  name!: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: String, nullable: true })
  timeZone?: string | null;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => EventTypeModel_2024_04_15)
  @IsArray()
  @ApiPropertyOptional({ type: [EventTypeModel_2024_04_15] })
  eventType?: EventTypeModel_2024_04_15[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityModel_2024_04_15)
  @IsArray()
  @ApiPropertyOptional({ type: [AvailabilityModel_2024_04_15] })
  availability?: AvailabilityModel_2024_04_15[];
}

export class UpdatedScheduleOutput_2024_04_15 {
  @ValidateNested()
  @Type(() => ScheduleModel_2024_04_15)
  @ApiProperty({ type: ScheduleModel_2024_04_15 })
  schedule!: ScheduleModel_2024_04_15;

  @IsBoolean()
  @ApiProperty()
  isDefault!: boolean;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  timeZone?: string;

  @IsOptional()
  @IsInt()
  @ApiPropertyOptional({ type: Number, nullable: true })
  prevDefaultId?: number | null;

  @IsOptional()
  @IsInt()
  @ApiPropertyOptional({ type: Number, nullable: true })
  currentDefaultId?: number | null;
}
