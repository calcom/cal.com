import { CreateAvailabilityInput } from "@/modules/availabilities/inputs/create-availability.input";
import { IsTimeZone } from "@/modules/users/inputs/validators/is-time-zone";
import { Type } from "class-transformer";
import { IsBoolean, IsOptional, IsString, Validate, ValidateNested } from "class-validator";

export class UpdateScheduleInput {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @Validate(IsTimeZone)
  timeZone?: string;

  @ValidateNested({ each: true })
  @Type(() => CreateAvailabilityInput)
  @IsOptional()
  availabilities?: CreateAvailabilityInput[];

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
