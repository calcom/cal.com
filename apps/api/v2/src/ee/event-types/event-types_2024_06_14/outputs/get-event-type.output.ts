import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { EventTypeOutput_2024_06_14, TeamEventTypeOutput_2024_06_14 } from "@calcom/platform-types";
import { ApiExtraModels, ApiProperty, getSchemaPath } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn } from "class-validator";

@ApiExtraModels(EventTypeOutput_2024_06_14, TeamEventTypeOutput_2024_06_14)
export class GetEventTypeOutput_2024_06_14 {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsIn([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(EventTypeOutput_2024_06_14) },
      { $ref: getSchemaPath(TeamEventTypeOutput_2024_06_14) },
    ],
  })
  @Type(() => Object)
  data!: EventTypeOutput_2024_06_14 | TeamEventTypeOutput_2024_06_14 | null;
}
