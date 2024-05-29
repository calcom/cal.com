import { EventTypeOutput } from "@/ee/event-types/outputs/event-type.output";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsEnum, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

class EventTypeGroup {
  @ValidateNested({ each: true })
  @Type(() => EventTypeOutput)
  @IsArray()
  eventTypes!: EventTypeOutput[];
}

export class GetEventTypesData {
  @ValidateNested({ each: true })
  @Type(() => EventTypeGroup)
  @IsArray()
  eventTypeGroups!: EventTypeGroup[];
}

export class GetEventTypesOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ValidateNested({ each: true })
  @Type(() => GetEventTypesData)
  @IsArray()
  data!: GetEventTypesData;
}
