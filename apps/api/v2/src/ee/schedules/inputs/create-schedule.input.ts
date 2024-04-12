import { CreateAvailabilityInput } from "@/modules/availabilities/inputs/create-availability.input";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsTimeZone, IsOptional, IsString, ValidateNested } from "class-validator";

export class CreateScheduleInput {
  @IsString()
  name!: string;

  @IsTimeZone()
  timeZone!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAvailabilityInput)
  @IsOptional()
  availabilities?: CreateAvailabilityInput[];

  @IsBoolean()
  isDefault!: boolean;
}
