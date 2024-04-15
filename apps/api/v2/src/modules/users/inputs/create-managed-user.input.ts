import { IsTimeFormat } from "@/modules/users/inputs/validators/is-time-format";
import { IsWeekStart } from "@/modules/users/inputs/validators/is-week-start";
import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsTimeZone, IsString, Validate } from "class-validator";

export class CreateManagedUserInput {
  @IsString()
  @ApiProperty({ example: "alice@example.com" })
  email!: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  @Validate(IsTimeFormat)
  @ApiProperty({ example: 12 })
  timeFormat?: number;

  @IsString()
  @IsOptional()
  @Validate(IsWeekStart)
  @ApiProperty({ example: "Sunday" })
  weekStart?: string;

  @IsTimeZone()
  @IsOptional()
  @ApiProperty({ example: "America/New_York" })
  timeZone?: string;
}
