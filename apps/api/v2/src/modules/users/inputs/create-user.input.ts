import { IsTimeFormat } from "@/modules/users/inputs/validators/is-time-format";
import { IsTimeZone } from "@/modules/users/inputs/validators/is-time-zone";
import { IsWeekStart } from "@/modules/users/inputs/validators/is-week-start";
import { IsNumber, IsOptional, IsString, Validate } from "class-validator";

export class CreateUserInput {
  @IsString()
  email!: string;

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

  @IsString()
  @IsOptional()
  @Validate(IsTimeZone)
  timeZone?: string;
}
