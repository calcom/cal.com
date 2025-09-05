import {
  ApiResponseWithoutData,
  RangeSlotsOutput_2024_09_04,
  SlotsOutput_2024_09_04,
} from "@calcom/platform-types";
import { ApiExtraModels, ApiProperty, getSchemaPath } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, ValidateNested } from "class-validator";

@ApiExtraModels(SlotsOutput_2024_09_04, RangeSlotsOutput_2024_09_04)
export class ResponseSlotsOutputData {
  @IsNumber()
  @ApiProperty()
  eventTypeId!: number;

  @ValidateNested()
  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(SlotsOutput_2024_09_04) },
      { $ref: getSchemaPath(RangeSlotsOutput_2024_09_04) },
    ],
  })
  @Type(() => Object)
  slots!: SlotsOutput_2024_09_04 | RangeSlotsOutput_2024_09_04;
}

export class ResponseSlotsOutput extends ApiResponseWithoutData {
  @ValidateNested()
  @ApiProperty({
    type: ResponseSlotsOutputData,
  })
  @Type(() => ResponseSlotsOutputData)
  data!: ResponseSlotsOutputData;
}
