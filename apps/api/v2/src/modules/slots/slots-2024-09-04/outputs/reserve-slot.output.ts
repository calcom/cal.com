import { Type } from "class-transformer";
import { ValidateNested } from "class-validator";

import {
  ApiResponseWithoutData,
  ReserveSlotOutput_2024_09_04 as ReserveSlotOutputType_2024_09_04,
} from "@calcom/platform-types";

export class ReserveSlotOutput_2024_09_04 extends ApiResponseWithoutData {
  @ValidateNested()
  @Type(() => ReserveSlotOutputType_2024_09_04)
  data!: ReserveSlotOutputType_2024_09_04;
}
