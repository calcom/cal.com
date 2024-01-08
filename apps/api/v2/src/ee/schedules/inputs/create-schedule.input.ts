import { CreateAvailabilityInput } from "@/ee/availabilities/inputs/create-availability.input";
import { IsOptional, IsString } from "class-validator";

import { TimeZone } from "@calcom/platform-constants";

export class CreateScheduleInput {
  @IsString()
  name!: string;

  @IsString()
  timeZone!: TimeZone;

  @IsOptional()
  availabilities?: CreateAvailabilityInput[];

  @IsOptional()
  isDefault?: boolean = false;
}
