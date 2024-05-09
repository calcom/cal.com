import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsTimeZone, IsString } from "class-validator";

export type WeekDay = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
export type TimeFormat = 12 | 24;
export class CreateManagedUserInput {
  @IsString()
  @ApiProperty({ example: "alice@example.com" })
  email!: string;

  @IsString()
  @IsOptional()
  name?: string;

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
  @ApiProperty({ example: "America/New_York" })
  timeZone?: string;
}
