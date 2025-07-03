import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsDateString, IsTimeZone, IsOptional, IsNumber, IsString, IsEnum, IsBoolean } from "class-validator";

import { SlotFormat } from "@calcom/platform-enums";

export class CreateRoutingFormResponseInput {
  @IsDateString({ strict: true })
  @ApiProperty({
    type: String,
    description: `
      Time starting from which available slots should be checked.
    
      Must be in UTC timezone as ISO 8601 datestring.
      
      You can pass date without hours which defaults to start of day or specify hours:
      2024-08-13 (will have hours 00:00:00 aka at very beginning of the date) or you can specify hours manually like 2024-08-13T09:00:00Z
      `,
    example: "2050-09-05",
  })
  start!: string;

  @IsDateString({ strict: true })
  @ApiProperty({
    type: String,
    description: `
      Time until which available slots should be checked.
      
      Must be in UTC timezone as ISO 8601 datestring.
      
      You can pass date without hours which defaults to end of day or specify hours:
      2024-08-20 (will have hours 23:59:59 aka at the very end of the date) or you can specify hours manually like 2024-08-20T18:00:00Z`,
    example: "2050-09-06",
  })
  end!: string;

  @IsTimeZone()
  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    description: "Time zone in which the available slots should be returned. Defaults to UTC.",
    example: "Europe/Rome",
  })
  timeZone?: string;

  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({
    type: Number,
    description:
      "If event type has multiple possible durations then you can specify the desired duration here. Also, if you are fetching slots for a dynamic event then you can specify the duration her which defaults to 30, meaning that returned slots will be each 30 minutes long.",
    example: "60",
  })
  duration?: number;

  @IsString()
  @IsEnum(SlotFormat, {
    message: "format must be either 'range' or 'time'",
  })
  @Transform(({ value }) => {
    if (!value) return undefined;
    return value.toLowerCase();
  })
  @IsOptional()
  @ApiPropertyOptional({
    description: "Format of slot times in response. Use 'range' to get start and end times.",
    example: "range",
    enum: SlotFormat,
  })
  format?: SlotFormat;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    description:
      "The unique identifier of the booking being rescheduled. When provided will ensure that the original booking time appears within the returned available slots when rescheduling.",
    example: "abc123def456",
  })
  bookingUidToReschedule?: string;

  @Transform(({ value }: { value: string | boolean }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return undefined;
  })
  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    type: Boolean,
    description: "Whether to queue the form response.",
    example: true,
  })
  queueResponse?: boolean;
} 