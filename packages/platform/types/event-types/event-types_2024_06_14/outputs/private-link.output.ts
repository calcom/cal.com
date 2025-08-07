import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PrivateLinkOutput_2024_06_14 {
  @ApiProperty({
    description: "The private link ID",
    type: String,
    example: "abc123def456",
  })
  id!: string;

  @ApiProperty({
    description: "The private link hash",
    type: String,
    example: "abc123def456",
  })
  link!: string;

  @ApiPropertyOptional({
    description: "Expiration date for time-based links",
    type: Date,
    example: "2024-12-31T23:59:59.000Z",
  })
  expiresAt?: Date | null;

  @ApiPropertyOptional({
    description: "Maximum number of times the link can be used. Only present for usage-based links (not time-based expiration links)",
    type: Number,
    example: 10,
  })
  maxUsageCount?: number | null;

  @ApiPropertyOptional({
    description: "Current usage count. Only present for usage-based links (not time-based expiration links)",
    type: Number,
    example: 3,
  })
  usageCount?: number;

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

export class CreatePrivateLinkOutput_2024_06_14 {
  @ApiProperty({
    description: "Response status",
    example: "success",
  })
  status!: string;

  @ApiProperty({
    description: "Created private link data",
    type: PrivateLinkOutput_2024_06_14,
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
    description: "Array of private links for the event type",
    type: [PrivateLinkOutput_2024_06_14],
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
    description: "Updated private link data",
    type: PrivateLinkOutput_2024_06_14,
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
