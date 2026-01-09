import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsDate, IsInt, Min, IsString } from "class-validator";

export class CreatePrivateLinkInput {
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ApiPropertyOptional({
    description: "Expiration date for time-based links",
    type: String,
    format: "date-time",
    example: "2024-12-31T23:59:59.000Z",
  })
  expiresAt?: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({
    description:
      "Maximum number of times the link can be used. If omitted and expiresAt is not provided, defaults to 1 (one time use).",
    type: Number,
    example: 10,
    minimum: 1,
    default: 1,
  })
  maxUsageCount?: number;
}

export class UpdatePrivateLinkInput {
  @IsString()
  @ApiProperty({
    description: "The private link hash to update",
    type: String,
    example: "abc123def456",
  })
  linkId!: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ApiPropertyOptional({
    description: "New expiration date for time-based links",
    type: Date,
    example: "2024-12-31T23:59:59.000Z",
  })
  expiresAt?: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({
    description: "New maximum number of times the link can be used",
    type: Number,
    example: 10,
    minimum: 1,
  })
  maxUsageCount?: number;
}

export class UpdatePrivateLinkBody {
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ApiPropertyOptional({
    description: "New expiration date for time-based links",
    type: Date,
    example: "2024-12-31T23:59:59.000Z",
  })
  expiresAt?: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({
    description: "New maximum number of times the link can be used",
    type: Number,
    example: 10,
    minimum: 1,
  })
  maxUsageCount?: number;
}
