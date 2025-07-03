import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsInt, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

import { ApiResponseWithoutData, SlotsOutput_2024_09_04, RangeSlotsOutput_2024_09_04 } from "@calcom/platform-types";
class Routing {
  @ApiProperty({
    type: String,
    description: "The ID of the queued form response. Only present if the form response was queued.",
    example: "123",
  })
  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  queuedResponseId?: string | null;

  @ApiProperty({
    type: Number,
    description: "The ID of the routing form response.",
    example: 123,
  })
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional()
  responseId?: number | null;

  @ApiProperty({
    type: [Number],
    description: "Array of team member IDs that were routed to handle this booking.",
    example: [101, 102],
  })
  @IsArray()
  @IsInt({ each: true })
  teamMemberIds!: number[];

  @ApiPropertyOptional({
    type: String,
    description: "The email of the team member assigned to handle this booking.",
    example: "john.doe@example.com",
  })
  @IsString()
  @IsOptional()
  teamMemberEmail?: string;
}

export class CreateRoutingFormResponseOutputData {
  @IsNumber()
  @ApiProperty()
  eventTypeId!: number;

  @ValidateNested()
  @ApiProperty({ type: Routing })
  @Type(() => Routing)
  routing!: Routing;

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