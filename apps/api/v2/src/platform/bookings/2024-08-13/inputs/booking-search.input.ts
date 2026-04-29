import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsDateString, IsIn, IsOptional, IsString } from "class-validator";

const bookingSearchStatuses = ["accepted", "cancelled", "rejected", "pending", "awaiting_host"] as const;

export class BookingSearchInput_2024_08_13 {
  @ApiProperty({
    description: "Filter bookings by attendee email (partial match).",
    required: false,
    example: "guest@example.com",
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  email?: string;

  @ApiProperty({
    description: "Filter bookings by event type id, slug, or title.",
    required: false,
    example: "30",
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  eventType?: string;

  @ApiProperty({
    description: "Filter bookings by status.",
    required: false,
    enum: bookingSearchStatuses,
    example: "accepted",
  })
  @IsOptional()
  @IsIn(bookingSearchStatuses)
  status?: (typeof bookingSearchStatuses)[number];

  @ApiProperty({
    description: "Filter bookings with start time greater than or equal to this ISO datetime.",
    required: false,
    example: "2026-04-01T00:00:00.000Z",
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiProperty({
    description: "Filter bookings with start time less than or equal to this ISO datetime.",
    required: false,
    example: "2026-04-30T23:59:59.999Z",
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
