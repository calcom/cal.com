import { IsTimeFormat } from "@/modules/users/inputs/validators/is-time-format";
import { IsWeekStart } from "@/modules/users/inputs/validators/is-week-start";
import { IsNumber, IsOptional, IsTimeZone, IsString, Validate } from "class-validator";

export class CreateUserInput {
  @IsString()
  email!: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  @Validate(IsTimeFormat)
  timeFormat?: number;

  @IsNumber()
  @IsOptional()
  defaultScheduleId?: number;

  @IsString()
  @IsOptional()
  @Validate(IsWeekStart)
  weekStart?: string;

  @IsTimeZone()
  @IsOptional()
  timeZone?: string;
}
