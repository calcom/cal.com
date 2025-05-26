import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmptyObject, ValidateNested } from "class-validator";

import {
  ApiResponseWithoutData,
  GetReservedSlotOutput_2024_09_04 as GetReservedSlotOutputType_2024_09_04,
} from "@calcom/platform-types";

export class GetReservedSlotOutput_2024_09_04 extends ApiResponseWithoutData {
  @ApiProperty({
    type: GetReservedSlotOutputType_2024_09_04,
  })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => GetReservedSlotOutputType_2024_09_04)
  data!: GetReservedSlotOutputType_2024_09_04 | null;
}
