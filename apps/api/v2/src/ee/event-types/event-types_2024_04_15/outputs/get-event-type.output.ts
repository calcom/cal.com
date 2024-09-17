import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

import { EventTypeOutput } from "./event-type.output";

class Data {
  @ApiProperty({
    type: EventTypeOutput,
  })
  @ValidateNested()
  @Type(() => EventTypeOutput)
  eventType!: EventTypeOutput;
}

export class GetEventTypeOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: Data,
  })
  @ValidateNested()
  @Type(() => Data)
  data!: Data;
}
