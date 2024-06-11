import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsEnum, IsNotEmptyObject, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

import { ScheduleOutput_2024_06_11 } from "./schedule.output";

export class GetSchedulesOutput_2024_06_11 {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({ type: [ScheduleOutput_2024_06_11] })
  @IsNotEmptyObject()
  @ValidateNested({ each: true })
  @Type(() => ScheduleOutput_2024_06_11)
  @IsArray()
  data!: ScheduleOutput_2024_06_11[];

  error?: Error;
}
