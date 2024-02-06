import { CreateAvailabilityInput } from "@/modules/availabilities/inputs/create-availability.input";
import { Type } from "class-transformer";
import { IsBoolean, IsOptional, IsString, ValidateNested } from "class-validator";

import { TimeZone } from "@calcom/platform-constants";

export class UpdateScheduleInput {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  timeZone?: TimeZone;

  @ValidateNested({ each: true })
  @Type(() => CreateAvailabilityInput)
  @IsOptional()
  availabilities?: CreateAvailabilityInput[];

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
