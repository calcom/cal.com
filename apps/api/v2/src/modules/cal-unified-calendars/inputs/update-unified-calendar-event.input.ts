import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsISO8601, IsOptional, IsString, ValidateNested } from "class-validator";

export class UpdateDateTimeWithZone {
  @IsISO8601()
  @IsOptional()
  @ApiPropertyOptional({ type: "string", format: "date-time" })
  time?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  timeZone?: string;
}

export class UpdateUnifiedCalendarEventInput {
  @ValidateNested()
  @Type(() => UpdateDateTimeWithZone)
  @IsOptional()
  @ApiPropertyOptional({
    type: "object",
    properties: {
      time: { type: "string", format: "date-time" },
      timeZone: { type: "string" },
    },
    description: "Start date and time of the calendar event with timezone information",
  })
  start?: UpdateDateTimeWithZone;

  @ValidateNested()
  @Type(() => UpdateDateTimeWithZone)
  @IsOptional()
  @ApiPropertyOptional({
    type: "object",
    properties: {
      time: { type: "string", format: "date-time" },
      timeZone: { type: "string" },
    },
    description: "End date and time of the calendar event with timezone information",
  })
  end?: UpdateDateTimeWithZone;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    description: "Title of the calendar event",
  })
  title?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: "Detailed description of the calendar event",
  })
  description?: string | null;
}
