import { Locales } from "@/lib/enums/locales";
import { CapitalizeTimeZone } from "@/lib/inputs/capitalize-timezone";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsOptional, IsTimeZone, IsString, IsEnum, IsIn, IsUrl, IsObject, IsNumber } from "class-validator";

import { ValidateMetadata } from "@calcom/platform-types";

export type WeekDay = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
export type TimeFormat = 12 | 24;
export class CreateManagedUserInput {
  @IsString()
  @ApiProperty({ example: "alice@example.com" })
  email!: string;

  @IsString()
  @ApiProperty({ example: "Alice Smith", description: "Managed user's name is used in emails" })
  name!: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @IsIn([12, 24], { message: "timeFormat must be a number either 12 or 24" })
  @ApiPropertyOptional({ example: 12, enum: [12, 24], description: "Must be a number 12 or 24" })
  timeFormat?: TimeFormat;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: "Monday",
    enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  })
  weekStart?: WeekDay;

  @Transform(({ value }) => (value === null ? undefined : value))
  @IsTimeZone()
  @IsOptional()
  @CapitalizeTimeZone()
  @ApiPropertyOptional({
    example: "America/New_York",
    description: `Timezone is used to create user's default schedule from Monday to Friday from 9AM to 5PM. If it is not passed then user does not have
      a default schedule and it must be created manually via the /schedules endpoint. Until the schedule is created, the user can't access availability atom to set his / her availability nor booked.
      It will default to Europe/London if not passed.`,
  })
  timeZone?: string;

  @IsEnum(Locales)
  @IsOptional()
  @ApiProperty({ example: Locales.EN, enum: Locales })
  locale?: Locales;

  @IsUrl()
  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    example: "https://cal.com/api/avatar/2b735186-b01b-46d3-87da-019b8f61776b.png",
    description: `URL of the user's avatar image`,
  })
  avatarUrl?: string;

  @ApiPropertyOptional({
    type: String,
    description: "Bio",
    example: "I am a bio",
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({
    type: Object,
    description:
      "You can store any additional data you want here. Metadata must have at most 50 keys, each key up to 40 characters, and values up to 500 characters.",
    example: { key: "value" },
  })
  @IsObject()
  @IsOptional()
  @ValidateMetadata({
    message:
      "Metadata must have at most 50 keys, each key up to 40 characters, and values up to 500 characters.",
  })
  metadata?: Record<string, string | boolean | number>;
}
