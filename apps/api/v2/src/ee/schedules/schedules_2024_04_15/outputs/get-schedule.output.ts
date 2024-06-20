import { ScheduleOutput } from "@/ee/schedules/schedules_2024_04_15/outputs/schedule.output";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsNotEmptyObject, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class GetScheduleOutput_2024_04_15 {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: ScheduleOutput,
  })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => ScheduleOutput)
  data!: ScheduleOutput;
}
