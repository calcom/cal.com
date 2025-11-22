import { ApiExtraModels, ApiProperty, getSchemaPath } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsString, ValidateNested } from "class-validator";

import { ApiResponseWithoutData, SlotsOutput_2024_09_04 } from "@calcom/platform-types";
import { RangeSlotsOutput_2024_09_04 } from "@calcom/platform-types";

@ApiExtraModels(SlotsOutput_2024_09_04, RangeSlotsOutput_2024_09_04)
export class GetSlotsOutput_2024_09_04 extends ApiResponseWithoutData {
  @ValidateNested()
  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(SlotsOutput_2024_09_04) },
      { $ref: getSchemaPath(RangeSlotsOutput_2024_09_04) },
    ],
  })
  @Type(() => Object)
  data!: SlotsOutput_2024_09_04 | RangeSlotsOutput_2024_09_04;

  @ApiProperty({
    required: false,
    description: "Human readable summary when no slots are available.",
    example: "No slots available",
  })
  @IsOptional()
  @IsString()
  message?: string;
}
