import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDate, IsOptional, IsArray, IsBoolean, IsInt, IsString, ValidateNested } from "class-validator";

class AvailabilityModel {
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
  eventTypeId?: number | null;

  @IsArray()
  @IsInt({ each: true })
  @ApiProperty({ type: [Number] })
  days!: number[];

  @IsDate()
  @Type(() => Date)
  @ApiProperty({ type: Date })
  startTime!: Date;

  @IsDate()
  @Type(() => Date)
  @ApiProperty({ type: Date })
  endTime!: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ApiPropertyOptional({ type: Date, nullable: true })
  date?: Date | null;

  @IsOptional()
  @IsInt()
  @ApiPropertyOptional({ type: Number, nullable: true })
  scheduleId?: number | null;
}

class WorkingHours {
  @IsArray()
  @IsInt({ each: true })
  @ApiProperty({ type: [Number] })
  days!: number[];

  @IsInt()
  @ApiProperty()
  startTime!: number;

  @IsInt()
  @ApiProperty()
  endTime!: number;

  @IsOptional()
  @IsInt()
  @ApiPropertyOptional({ type: Number, nullable: true })
  userId?: number | null;
}

class TimeRange {
  @IsOptional()
  @IsInt()
  @ApiPropertyOptional({ type: Number, nullable: true })
  userId?: number | null;

  @IsDate()
  @ApiProperty({ type: Date })
  start!: Date;

  @IsDate()
  @ApiProperty({ type: Date })
  end!: Date;
}

export class ScheduleOutput {
  @IsInt()
  @ApiProperty()
  id!: number;

  @IsString()
  @ApiProperty()
  name!: string;

  @IsBoolean()
  @ApiProperty()
  isManaged!: boolean;

  @ValidateNested({ each: true })
  @Type(() => WorkingHours)
  @ApiProperty({ type: [WorkingHours] })
  workingHours!: WorkingHours[];

  @ValidateNested({ each: true })
  @Type(() => AvailabilityModel)
  @IsArray()
  @ApiProperty({ type: [AvailabilityModel] })
  schedule!: AvailabilityModel[];

  @ApiProperty({ type: [[TimeRange]] })
  availability!: TimeRange[][];

  @IsString()
  @ApiProperty()
  timeZone!: string;

  @ValidateNested({ each: true })
  @IsArray()
  @ApiPropertyOptional({ type: [Object] })
  // note(Lauris) it should be
  // dateOverrides!: { ranges: TimeRange[] }[];
  // but docs aren't generating correctly it results in array of strings
  dateOverrides!: unknown[];

  @IsBoolean()
  @ApiProperty()
  isDefault!: boolean;

  @IsBoolean()
  @ApiProperty()
  isLastSchedule!: boolean;

  @IsBoolean()
  @ApiProperty()
  readOnly!: boolean;
}
