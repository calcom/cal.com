import { Type } from "class-transformer";
import { IsNotEmptyObject, ValidateNested } from "class-validator";

import { ApiResponseWithoutData, EventTypeOutput_2024_06_14 } from "@calcom/platform-types";

export class CreateUserEventTypeOutput extends ApiResponseWithoutData {
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => EventTypeOutput_2024_06_14)
  data!: EventTypeOutput_2024_06_14;
}
