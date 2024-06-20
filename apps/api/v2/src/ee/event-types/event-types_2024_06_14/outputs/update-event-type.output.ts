import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsNotEmptyObject, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";
import { EventTypeOutput_2024_06_14 } from "@calcom/platform-types";

export class UpdateEventTypeOutput_2024_06_14 {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsIn([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: EventTypeOutput_2024_06_14,
  })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => EventTypeOutput_2024_06_14)
  data!: EventTypeOutput_2024_06_14;
}
