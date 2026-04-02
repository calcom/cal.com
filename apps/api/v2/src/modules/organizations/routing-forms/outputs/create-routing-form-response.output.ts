import {
  ApiResponseWithoutData,
  RangeSlotsOutput_2024_09_04,
  SlotsOutput_2024_09_04,
} from "@calcom/platform-types";
import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

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

  @ApiPropertyOptional({
    type: Boolean,
    description: "Whether to skip contact owner assignment from CRM integration.",
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  skipContactOwner?: boolean;

  @ApiPropertyOptional({
    type: String,
    description: "The CRM application slug for integration.",
    example: "salesforce",
  })
  @IsString()
  @IsOptional()
  crmAppSlug?: string;

  @ApiPropertyOptional({
    type: String,
    description: "The CRM owner record type for contact assignment.",
    example: "Account",
  })
  @IsString()
  @IsOptional()
  crmOwnerRecordType?: string;
}

@ApiExtraModels(SlotsOutput_2024_09_04, RangeSlotsOutput_2024_09_04)
export class CreateRoutingFormResponseOutputData {
  @ApiPropertyOptional({
    type: Number,
    description: "The ID of the event type that was routed to.",
    example: 123,
  })
  @IsNumber()
  @IsOptional()
  eventTypeId?: number;

  @ValidateNested()
  @Type(() => Routing)
  @ApiPropertyOptional({
    type: Routing,
    description: "The routing information that could be passed as is to the booking API.",
    example: {
      eventTypeId: 123,
      routing: {
        teamMemberIds: [101, 102],
        teamMemberEmail: "john.doe@example.com",
        skipContactOwner: true,
      },
    },
  })
  routing?: Routing;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    description: "A custom message to be displayed to the user in case of routing to a custom page.",
    example: "This is a custom message.",
  })
  routingCustomMessage?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    description: "The external redirect URL to be used in case of routing to a non cal.com event type URL.",
    example: "https://example.com/",
  })
  routingExternalRedirectUrl?: string;

  @ValidateNested()
  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(SlotsOutput_2024_09_04) },
      { $ref: getSchemaPath(RangeSlotsOutput_2024_09_04) },
    ],
  })
  @Type(() => Object)
  slots?: SlotsOutput_2024_09_04 | RangeSlotsOutput_2024_09_04;
}

export class CreateRoutingFormResponseOutput extends ApiResponseWithoutData {
  @ValidateNested()
  @ApiProperty({ type: CreateRoutingFormResponseOutputData })
  @Type(() => CreateRoutingFormResponseOutputData)
  data!: CreateRoutingFormResponseOutputData;
}
