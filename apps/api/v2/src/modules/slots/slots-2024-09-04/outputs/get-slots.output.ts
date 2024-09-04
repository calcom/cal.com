import { Type } from "class-transformer";
import { ValidateNested } from "class-validator";

import { ApiResponseWithoutData, SlotsOutput_2024_09_04 } from "@calcom/platform-types";

export class GetSlotsOutput_2024_09_04 extends ApiResponseWithoutData {
  @ValidateNested()
  @Type(() => SlotsOutput_2024_09_04)
  data!: SlotsOutput_2024_09_04;
}
