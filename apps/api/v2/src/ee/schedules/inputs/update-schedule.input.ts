import { CreateAvailabilityInput } from "@/modules/availabilities/inputs/create-availability.input";
import { IsOptional, IsString, ValidateNested } from "class-validator";

import { TimeZone } from "@calcom/platform-constants";

export class UpdateScheduleInput {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  timeZone?: TimeZone;

  @ValidateNested({ each: true })
  @IsOptional()
  availabilities?: CreateAvailabilityInput[];
}
