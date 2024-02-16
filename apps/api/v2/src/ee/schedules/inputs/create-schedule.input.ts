import { CreateAvailabilityInput } from "@/modules/availabilities/inputs/create-availability.input";
import { IsTimeZone } from "@/modules/users/inputs/validators/is-time-zone";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsOptional, IsString, Validate, ValidateNested } from "class-validator";

export class CreateScheduleInput {
  @IsString()
  name!: string;

  @IsString()
  @Validate(IsTimeZone)
  timeZone!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAvailabilityInput)
  @IsOptional()
  availabilities?: CreateAvailabilityInput[];

  @IsBoolean()
  @IsOptional()
  isDefault = true;
}
