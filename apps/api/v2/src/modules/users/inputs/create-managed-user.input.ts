import { Locales } from "@/lib/enums/locales";
import { CapitalizeTimeZone } from "@/lib/inputs/capitalize-timezone";
import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsTimeZone, IsString, IsEnum } from "class-validator";

export type WeekDay = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
export type TimeFormat = 12 | 24;
export class CreateManagedUserInput {
  @IsString()
  @ApiProperty({ example: "alice@example.com" })
  email!: string;

  @IsString()
  @ApiProperty({ example: "Alice Smith", description: "Managed user's name is used in emails" })
  name!: string;

  @IsOptional()
  @ApiProperty({ example: 12, enum: [12, 24], description: "Must be 12 or 24" })
  timeFormat?: TimeFormat;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: "Monday",
    enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  })
  weekStart?: WeekDay;

  @IsTimeZone()
  @IsOptional()
  @CapitalizeTimeZone()
  @ApiProperty({
    example: "America/New_York",
    description: `Timezone is used to create user's default schedule from Monday to Friday from 9AM to 5PM. If it is not passed then user does not have
      a default schedule and it must be created manually via the /schedules endpoint. Until the schedule is created, the user can't access availability atom to set his / her availability nor booked.`,
  })
  timeZone?: string;

  @IsEnum(Locales)
  @IsOptional()
  @ApiProperty({ example: Locales.EN, enum: Locales })
  locale?: Locales;
}
