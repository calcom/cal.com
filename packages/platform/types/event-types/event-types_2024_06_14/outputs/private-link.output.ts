import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

// Base class with common properties
abstract class BasePrivateLinkOutput_2024_06_14 {
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
    example: "https://cal.com/d/abc123def456/30min",
  })
  bookingUrl!: string;
}

// Time-based private link (expires at a specific date)
export class TimeBasedPrivateLinkOutput_2024_06_14 extends BasePrivateLinkOutput_2024_06_14 {
  @ApiProperty({
    description: "Expiration date for this time-based link",
    type: Date,
    example: "2024-12-31T23:59:59.000Z",
  })
  expiresAt!: Date;
}

// Usage-based private link (expires after N uses)
export class UsageBasedPrivateLinkOutput_2024_06_14 extends BasePrivateLinkOutput_2024_06_14 {
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
export type PrivateLinkOutput_2024_06_14 = TimeBasedPrivateLinkOutput_2024_06_14 | UsageBasedPrivateLinkOutput_2024_06_14;

export class CreatePrivateLinkOutput_2024_06_14 {
  @ApiProperty({
    description: "Response status",
    example: "success",
  })
  status!: string;

  @ApiProperty({
    description: "Created private link data (either time-based or usage-based)",
    oneOf: [
      { $ref: "#/components/schemas/TimeBasedPrivateLinkOutput_2024_06_14" },
      { $ref: "#/components/schemas/UsageBasedPrivateLinkOutput_2024_06_14" },
    ],
  })
  data!: PrivateLinkOutput_2024_06_14;
}

export class GetPrivateLinksOutput_2024_06_14 {
  @ApiProperty({
    description: "Response status",
    example: "success",
  })
  status!: string;

  @ApiProperty({
    description: "Array of private links for the event type (mix of time-based and usage-based)",
    type: "array",
    items: {
      oneOf: [
        { $ref: "#/components/schemas/TimeBasedPrivateLinkOutput_2024_06_14" },
        { $ref: "#/components/schemas/UsageBasedPrivateLinkOutput_2024_06_14" },
      ],
    },
  })
  data!: PrivateLinkOutput_2024_06_14[];
}

export class UpdatePrivateLinkOutput_2024_06_14 {
  @ApiProperty({
    description: "Response status",
    example: "success",
  })
  status!: string;

  @ApiProperty({
    description: "Updated private link data (either time-based or usage-based)",
    oneOf: [
      { $ref: "#/components/schemas/TimeBasedPrivateLinkOutput_2024_06_14" },
      { $ref: "#/components/schemas/UsageBasedPrivateLinkOutput_2024_06_14" },
    ],
  })
  data!: PrivateLinkOutput_2024_06_14;
}

export class DeletePrivateLinkOutput_2024_06_14 {
  @ApiProperty({
    description: "Response status",
    example: "success",
  })
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
