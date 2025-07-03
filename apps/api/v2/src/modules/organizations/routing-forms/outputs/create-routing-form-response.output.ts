import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsNumber, IsOptional, ValidateNested } from "class-validator";

import { ApiResponseWithoutData, SlotsOutput_2024_09_04, RangeSlotsOutput_2024_09_04 } from "@calcom/platform-types";

export class CreateRoutingFormResponseOutputData {
  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional()
  responseId!: number | null;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional()
  queuedResponseId!: string | null;

  @IsNumber()
  @ApiProperty()
  eventTypeId!: number;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  @ApiPropertyOptional({ type: [Number] })
  routedTeamMemberIds!: number[] | null;

  @ValidateNested()
  @ApiProperty({
    oneOf: [
      { type: 'object', description: 'Time slots' },
      { type: 'object', description: 'Range slots' },
    ],
  })
  @Type(() => Object)
  slots!: SlotsOutput_2024_09_04 | RangeSlotsOutput_2024_09_04;
}

export class CreateRoutingFormResponseOutput extends ApiResponseWithoutData {
  @ValidateNested()
  @ApiProperty({ type: CreateRoutingFormResponseOutputData })
  @Type(() => CreateRoutingFormResponseOutputData)
  data!: CreateRoutingFormResponseOutputData;
} 