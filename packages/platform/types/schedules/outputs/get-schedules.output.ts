import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsEnum, IsNotEmptyObject, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

import { ScheduleOutput } from "./schedule.output";

export class GetSchedulesOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({ type: [ScheduleOutput] })
  @IsNotEmptyObject()
  @ValidateNested({ each: true })
  @Type(() => ScheduleOutput)
  @IsArray()
  data!: ScheduleOutput[];

  error?: Error;
}
