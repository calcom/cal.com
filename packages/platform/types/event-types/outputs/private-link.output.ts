import { ApiExtraModels, ApiProperty, getSchemaPath } from "@nestjs/swagger";

// Base class with common properties
abstract class BasePrivateLinkOutput {
  @ApiProperty({
    description: "The private link ID",
    type: String,
    example: "abc123def456",
  })
  linkId!: string;

  @ApiProperty({
    description: "Event type ID this link belongs to",
    type: Number,
    example: 123,
  })
  eventTypeId!: number;

  @ApiProperty({
    description: "Whether the link is currently expired",
    type: Boolean,
    example: false,
  })
  isExpired!: boolean;

  @ApiProperty({
    description: "Full booking URL for this private link",
    type: String,
    format: "uri",
    example: "https://cal.com/d/abc123def456/30min",
  })
  bookingUrl!: string;
}

// Time-based private link (expires at a specific date)
export class TimeBasedPrivateLinkOutput extends BasePrivateLinkOutput {
  @ApiProperty({
    description: "Expiration date for this time-based link",
    type: String,
    format: "date-time",
    example: "2025-12-31T23:59:59.000Z",
  })
  expiresAt!: Date;
}

// Usage-based private link (expires after N uses)
export class UsageBasedPrivateLinkOutput extends BasePrivateLinkOutput {
  @ApiProperty({
    description: "Maximum number of times this link can be used",
    type: Number,
    example: 10,
  })
  maxUsageCount!: number;

  @ApiProperty({
    description: "Current usage count for this link",
    type: Number,
    example: 3,
  })
  usageCount!: number;
}

// Union type for either time-based or usage-based links
export type PrivateLinkOutput = TimeBasedPrivateLinkOutput | UsageBasedPrivateLinkOutput;

@ApiExtraModels(TimeBasedPrivateLinkOutput, UsageBasedPrivateLinkOutput)
export class CreatePrivateLinkOutput {
  @ApiProperty({ description: "Response status", example: "success" })
  status!: string;

  @ApiProperty({
    description: "Created private link data (either time-based or usage-based)",
    oneOf: [
      { $ref: getSchemaPath(TimeBasedPrivateLinkOutput) },
      { $ref: getSchemaPath(UsageBasedPrivateLinkOutput) },
    ],
  })
  data!: PrivateLinkOutput;
}

@ApiExtraModels(TimeBasedPrivateLinkOutput, UsageBasedPrivateLinkOutput)
export class GetPrivateLinksOutput {
  @ApiProperty({ description: "Response status", example: "success" })
  status!: string;

  @ApiProperty({
    description: "Array of private links for the event type (mix of time-based and usage-based)",
    type: "array",
    items: {
      oneOf: [
        { $ref: getSchemaPath(TimeBasedPrivateLinkOutput) },
        { $ref: getSchemaPath(UsageBasedPrivateLinkOutput) },
      ],
    },
  })
  data!: PrivateLinkOutput[];
}

@ApiExtraModels(TimeBasedPrivateLinkOutput, UsageBasedPrivateLinkOutput)
export class UpdatePrivateLinkOutput {
  @ApiProperty({ description: "Response status", example: "success" })
  status!: string;

  @ApiProperty({
    description: "Updated private link data (either time-based or usage-based)",
    oneOf: [
      { $ref: getSchemaPath(TimeBasedPrivateLinkOutput) },
      { $ref: getSchemaPath(UsageBasedPrivateLinkOutput) },
    ],
  })
  data!: PrivateLinkOutput;
}

export class DeletePrivateLinkOutput {
  @ApiProperty({ description: "Response status", example: "success" })
  status!: string;

  @ApiProperty({
    description: "Deleted link information",
    type: "object",
    properties: {
      linkId: { type: "string", example: "abc123def456" },
      message: { type: "string", example: "Private link deleted successfully" },
    },
  })
  data!: {
    linkId: string;
    message: string;
  };
}
