import { TimeFormat, WeekDay } from "@/modules/users/inputs/enums";
import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNumber, IsOptional, IsString, IsTimeZone } from "class-validator";

export class UpdateManagedUserInput {
  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(TimeFormat)
  @IsOptional()
  @ApiProperty({ example: TimeFormat.Hour12, enum: TimeFormat })
  timeFormat?: TimeFormat;

  @IsNumber()
  @IsOptional()
  defaultScheduleId?: number;

  @IsEnum(WeekDay)
  @IsOptional()
  @ApiProperty({ example: WeekDay.Sunday, enum: WeekDay })
  weekStart?: WeekDay;

  @IsTimeZone()
  @IsOptional()
  timeZone?: string;
}
