import { CreateAvailabilityInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-availability.input";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsTimeZone, IsOptional, IsString, ValidateNested } from "class-validator";

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
