import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsNotEmptyObject, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

import { ScheduleOutput_2024_06_11 } from "./schedule.output";

export class GetDefaultScheduleOutput_2024_06_11 {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;
  @ApiProperty({
    type: ScheduleOutput_2024_06_11,
  })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => ScheduleOutput_2024_06_11)
  data!: ScheduleOutput_2024_06_11 | null;
}
