import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsTimeZone, IsOptional, IsString, ValidateNested } from "class-validator";

import { CreateAvailabilityInput_2024_04_15 } from "./create-availability.input";

export class CreateScheduleInput_2024_04_15 {
  @IsString()
  name!: string;

  @IsTimeZone()
  timeZone!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAvailabilityInput_2024_04_15)
  @IsOptional()
  availabilities?: CreateAvailabilityInput_2024_04_15[];

  @IsBoolean()
  isDefault!: boolean;
}
