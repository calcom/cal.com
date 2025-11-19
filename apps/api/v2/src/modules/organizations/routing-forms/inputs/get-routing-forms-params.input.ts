import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional, IsBoolean, IsString, IsEnum, IsDate, IsISO8601 } from "class-validator";

enum SortOrder {
  ASC = "asc",
  DESC = "desc",
}

export class GetRoutingFormsParams {
  @ApiPropertyOptional({ type: Number, description: "Number of routing forms to skip" })
  @Transform(({ value }) => value && parseInt(value))
  @IsOptional()
  skip?: number;

  @ApiPropertyOptional({ type: Number, description: "Number of routing forms to take" })
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

  @ApiPropertyOptional({ type: Boolean, description: "Filter by disabled status" })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  })
  @IsBoolean()
  disabled?: boolean;

  @ApiPropertyOptional({ type: String, description: "Filter by name" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    description: "Filter by forms created after this date",
  })
  @IsOptional()
  @IsISO8601()
  @Transform(({ value }) => value && new Date(value))
  @IsDate()
  afterCreatedAt?: Date;

  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    description: "Filter by forms created before this date",
  })
  @IsOptional()
  @IsISO8601()
  @Transform(({ value }) => value && new Date(value))
  @IsDate()
  beforeCreatedAt?: Date;

  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    description: "Filter by forms updated after this date",
  })
  @IsOptional()
  @IsISO8601()
  @Transform(({ value }) => value && new Date(value))
  @IsDate()
  afterUpdatedAt?: Date;

  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    description: "Filter by forms updated before this date",
  })
  @IsOptional()
  @IsISO8601()
  @Transform(({ value }) => value && new Date(value))
  @IsDate()
  beforeUpdatedAt?: Date;
}
