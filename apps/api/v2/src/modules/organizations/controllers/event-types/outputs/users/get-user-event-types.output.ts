import { Type } from "class-transformer";
import { ValidateNested } from "class-validator";

import { ApiResponseWithoutData, EventTypeOutput_2024_06_14 } from "@calcom/platform-types";

export class GetUserEventTypesOutput extends ApiResponseWithoutData {
  @ValidateNested({ each: true })
  @Type(() => EventTypeOutput_2024_06_14)
  data!: EventTypeOutput_2024_06_14[];
}
