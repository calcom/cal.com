import { CreateAvailabilityInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-availability.input";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsTimeZone, IsOptional, IsString, ValidateNested } from "class-validator";

export class CreateScheduleInput_2024_04_15 {
  @IsString()
  @ApiProperty()
  name!: string;

  @IsTimeZone()
  @ApiProperty()
  timeZone!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAvailabilityInput_2024_04_15)
  @IsOptional()
  @ApiPropertyOptional({ type: [CreateAvailabilityInput_2024_04_15] })
  availabilities?: CreateAvailabilityInput_2024_04_15[];

  @IsBoolean()
  @ApiProperty()
  isDefault!: boolean;
}
