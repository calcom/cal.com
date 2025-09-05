import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { ArrayMinSize, IsArray, IsEnum, IsISO8601, IsNumber, IsOptional, IsString } from "class-validator";

enum SortOrder {
  ASC = "asc",
  DESC = "desc",
}

export class GetRoutingFormResponsesParams {
  @ApiPropertyOptional({ type: Number, description: "Number of responses to skip" })
  @Transform(({ value }) => value && parseInt(value))
  @IsOptional()
  skip?: number;

  @ApiPropertyOptional({ type: Number, description: "Number of responses to take" })
  @Transform(({ value }) => value && parseInt(value))
  @IsOptional()
  take?: number;

  @ApiPropertyOptional({ enum: SortOrder, description: "Sort by creation time" })
  @IsOptional()
  @IsEnum(SortOrder)
  sortCreatedAt?: "asc" | "desc";

  @ApiPropertyOptional({ enum: SortOrder, description: "Sort by update time" })
  @IsOptional()
  @IsEnum(SortOrder)
  sortUpdatedAt?: "asc" | "desc";

  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    description: "Filter by responses created after this date",
  })
  @IsOptional()
  @IsISO8601()
  afterCreatedAt?: string;

  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    description: "Filter by responses created before this date",
  })
  @IsOptional()
  @IsISO8601()
  beforeCreatedAt?: string;

  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    description: "Filter by responses created after this date",
  })
  @IsOptional()
  @IsISO8601()
  afterUpdatedAt?: string;

  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    description: "Filter by responses updated before this date",
  })
  @IsOptional()
  @IsISO8601()
  beforeUpdatedAt?: string;

  @ApiPropertyOptional({ type: String, description: "Filter by responses routed to a specific booking" })
  @IsOptional()
  @IsString()
  routedToBookingUid?: string;
}

export class GetRoutingFormsParams extends GetRoutingFormResponsesParams {
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return value.split(",").map((teamId: string) => parseInt(teamId));
    }
    return value;
  })
  @ApiPropertyOptional({
    type: [Number],
    description: "Filter by teamIds. Team ids must be separated by a comma.",
    example: "?teamIds=100,200",
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(1, { message: "teamIds must contain at least 1 team id" })
  teamIds?: number[];
}
