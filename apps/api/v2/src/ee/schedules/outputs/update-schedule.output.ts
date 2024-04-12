import { UpdatedScheduleOutput } from "@/ee/schedules/outputs/schedule-updated.output";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsNotEmptyObject, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class UpdateScheduleOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: UpdatedScheduleOutput,
  })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => UpdatedScheduleOutput)
  data!: UpdatedScheduleOutput;
}
