import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsDate, IsOptional, IsString, ValidateNested } from "class-validator";

export class ScheduleTimeRangeDto {
  @Type(() => Date)
  @IsDate()
  start!: Date;

  @Type(() => Date)
  @IsDate()
  end!: Date;
}

export class ScheduleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleTimeRangeDto)
  times!: ScheduleTimeRangeDto[];
}

export class UpdateAtomScheduleDto {
  @IsString()
  @IsOptional()
  timeZone?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScheduleTimeRangeDto)
  schedule?: ScheduleTimeRangeDto[][];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleTimeRangeDto)
  @IsOptional()
  dateOverrides?: ScheduleTimeRangeDto[];
}
