import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsISO8601, IsOptional, IsString, IsTimeZone } from "class-validator";

export class ListUnifiedCalendarEventsInput {
  @IsISO8601()
  @ApiProperty({
    type: String,
    description: "Start of the date range (ISO 8601 date or date-time)",
    example: "2026-03-01",
  })
  from!: string;

  @IsISO8601()
  @ApiProperty({
    type: String,
    description: "End of the date range (ISO 8601 date or date-time)",
    example: "2026-03-31",
  })
  to!: string;

  @IsTimeZone()
  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    description: "IANA time zone for the request (e.g. America/New_York)",
  })
  timeZone?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    description:
      "Calendar ID. Use 'primary' for the user's primary calendar, or the external ID of a connected calendar.",
    default: "primary",
  })
  calendarId?: string;
}
