import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsEnum, IsOptional, IsBoolean } from "class-validator";

import { FrequencyInput } from "@calcom/platform-enums";

export type TransformRecurringEventSchema_2024_06_14 = {
  interval: number;
  count: number;
  freq: number;
};

export class Recurrence_2024_06_14 {
  @IsInt()
  @ApiProperty({ example: 10, description: "Repeats every {count} week | month | year" })
  interval!: number;

  @IsInt()
  @ApiProperty({ example: 10, description: "Repeats for a maximum of {count} events" })
  occurrences!: number;

  @IsEnum(FrequencyInput)
  @ApiProperty({ enum: FrequencyInput })
  frequency!: FrequencyInput;

  @IsOptional()
  @IsBoolean()
  disabled?: boolean = false;
}
