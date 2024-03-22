import { CreateAvailabilityInput } from "@/modules/availabilities/inputs/create-availability.input";
import { Type } from "class-transformer";
import { IsBoolean, IsOptional, IsString, IsTimeZone, ValidateNested } from "class-validator";

export class UpdateScheduleInput {
  @IsString()
  @IsOptional()
  name?: string;

  @IsTimeZone()
  @IsOptional()
  timeZone?: string;

  @ValidateNested({ each: true })
  @Type(() => CreateAvailabilityInput)
  @IsOptional()
  availabilities?: CreateAvailabilityInput[];

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
