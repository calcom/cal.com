import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional, IsString, IsEnum, IsISO8601, IsDate, IsNumber, IsArray } from "class-validator";

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
  @Transform(({ value }) => value && new Date(value))
  @IsDate()
  afterCreatedAt?: Date;

  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    description: "Filter by responses created before this date",
  })
  @IsOptional()
  @IsISO8601()
  @Transform(({ value }) => value && new Date(value))
  @IsDate()
  beforeCreatedAt?: Date;

  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    description: "Filter by responses created after this date",
  })
  @IsOptional()
  @IsISO8601()
  @Transform(({ value }) => value && new Date(value))
  @IsDate()
  afterUpdatedAt?: Date;

  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    description: "Filter by responses updated before this date",
  })
  @IsOptional()
  @IsISO8601()
  @Transform(({ value }) => value && new Date(value))
  @IsDate()
  beforeUpdatedAt?: Date;

  @ApiPropertyOptional({ type: String, description: "Filter by responses routed to a specific booking" })
  @IsOptional()
  @IsString()
  routedToBookingUid?: string;
}

export class GetRoutingFormsParams extends GetRoutingFormResponsesParams {
  @ApiPropertyOptional({ type: [Number], description: "Filter by teamIds" })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : value ? [Number(value)] : []))
  teamIds?: number[];
}
