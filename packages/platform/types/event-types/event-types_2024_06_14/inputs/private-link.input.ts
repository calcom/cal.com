import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString, IsOptional, IsDate, IsInt, Min, IsArray, ValidateNested } from "class-validator";

export class CreatePrivateLinkInput_2024_06_14 {
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ApiPropertyOptional({
    description: "Expiration date for time-based links",
    type: Date,
    example: "2024-12-31T23:59:59.000Z",
  })
  expiresAt?: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({
    description: "Maximum number of times the link can be used",
    type: Number,
    example: 10,
    minimum: 1,
  })
  maxUsageCount?: number;
}

export class UpdatePrivateLinkInput_2024_06_14 {
  @IsString()
  @ApiProperty({
    description: "The private link ID to update",
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

export class PrivateLinkData {
  @IsString()
  @ApiProperty({
    description: "The private link ID",
    type: String,
    example: "abc123def456",
  })
  link!: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ApiPropertyOptional({
    description: "Expiration date for time-based links",
    type: Date,
    example: "2024-12-31T23:59:59.000Z",
  })
  expiresAt?: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({
    description: "Maximum number of times the link can be used",
    type: Number,
    example: 10,
    minimum: 1,
  })
  maxUsageCount?: number;
}

export class BulkUpdatePrivateLinksInput_2024_06_14 {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrivateLinkData)
  @ApiProperty({
    description: "Array of private links to create/update",
    type: [PrivateLinkData],
  })
  privateLinks!: PrivateLinkData[];
}
