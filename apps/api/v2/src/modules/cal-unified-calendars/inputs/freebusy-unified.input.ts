import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsISO8601, IsOptional, IsString } from "class-validator";

export class FreebusyUnifiedInput {
  @IsISO8601()
  @ApiProperty({
    type: String,
    description: "Start of the date range (ISO 8601 date or date-time)",
    example: "2026-03-10",
  })
  from!: string;

  @IsISO8601()
  @ApiProperty({
    type: String,
    description: "End of the date range (ISO 8601 date or date-time)",
    example: "2026-03-10",
  })
  to!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    description: "IANA time zone (e.g. America/New_York)",
  })
  timeZone?: string;
}
