import { UpdatedScheduleOutput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/outputs/schedule-updated.output";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsNotEmptyObject, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class UpdateScheduleOutput_2024_04_15 {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: UpdatedScheduleOutput_2024_04_15,
  })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => UpdatedScheduleOutput_2024_04_15)
  data!: UpdatedScheduleOutput_2024_04_15;
}
