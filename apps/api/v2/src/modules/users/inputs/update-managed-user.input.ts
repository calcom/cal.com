import { CapitalizeTimeZone } from "@/lib/inputs/capitalize-timezone";
import { TimeFormat, WeekDay } from "@/modules/users/inputs/create-managed-user.input";
import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNumber, IsOptional, IsString, IsTimeZone } from "class-validator";

export class UpdateManagedUserInput {
  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsOptional()
  @IsIn(["12", "24"])
  @ApiProperty({ example: 12, enum: [12, 24], description: "Must be 12 or 24" })
  timeFormat?: TimeFormat;

  @IsNumber()
  @IsOptional()
  defaultScheduleId?: number;

  @IsOptional()
  @IsString()
  @IsIn(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"])
  @ApiProperty({
    example: "Monday",
    enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  })
  weekStart?: WeekDay;

  @IsTimeZone()
  @IsOptional()
  @CapitalizeTimeZone()
  timeZone?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ example: "en", description: "Locale of the user" }) 
  locale?: string;
}
