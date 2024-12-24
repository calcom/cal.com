import { Locales } from "@/lib/enums/locales";
import { CapitalizeTimeZone } from "@/lib/inputs/capitalize-timezone";
import { TimeFormat, WeekDay } from "@/modules/users/inputs/create-managed-user.input";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsIn, IsNumber, IsOptional, IsString, IsTimeZone, IsUrl } from "class-validator";

export class UpdateManagedUserInput {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  name?: string;

  @IsOptional()
  @IsIn([12, 24])
  @ApiPropertyOptional({ example: 12, enum: [12, 24], description: "Must be 12 or 24" })
  timeFormat?: TimeFormat;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional()
  defaultScheduleId?: number;

  @IsOptional()
  @IsString()
  @IsIn(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"])
  @ApiPropertyOptional({
    example: "Monday",
    enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  })
  weekStart?: WeekDay;

  @IsTimeZone()
  @IsOptional()
  @CapitalizeTimeZone()
  @ApiPropertyOptional()
  timeZone?: string;

  @IsEnum(Locales)
  @IsOptional()
  @ApiPropertyOptional({ example: Locales.EN, enum: Locales })
  locale?: Locales;

  @IsUrl()
  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    example: "https://cal.com/api/avatar/2b735186-b01b-46d3-87da-019b8f61776b.png",
    description: `URL of the user's avatar image`,
  })
  avatarUrl?: string;
}
