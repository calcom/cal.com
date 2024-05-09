import { TimeFormat, WeekDay } from "@/modules/users/inputs/enums";
import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsTimeZone, IsString, IsEnum } from "class-validator";

export class CreateManagedUserInput {
  @IsString()
  @ApiProperty({ example: "alice@example.com" })
  email!: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(TimeFormat)
  @IsOptional()
  @ApiProperty({ example: TimeFormat.Hour12, enum: TimeFormat })
  timeFormat?: TimeFormat;

  @IsEnum(WeekDay)
  @IsOptional()
  @ApiProperty({ example: WeekDay.Sunday, enum: WeekDay })
  weekStart?: WeekDay;

  @IsTimeZone()
  @IsOptional()
  @ApiProperty({ example: "America/New_York" })
  timeZone?: string;
}
