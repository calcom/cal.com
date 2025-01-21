import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmptyObject, ValidateNested } from "class-validator";

import {
  ApiResponseWithoutData,
  ReserveSlotOutput_2024_09_04 as ReserveSlotOutputType_2024_09_04,
} from "@calcom/platform-types";

export class ReserveSlotOutputResponse_2024_09_04 extends ApiResponseWithoutData {
  @ApiProperty({
    type: ReserveSlotOutputType_2024_09_04,
  })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => ReserveSlotOutputType_2024_09_04)
  data!: ReserveSlotOutputType_2024_09_04;
}
