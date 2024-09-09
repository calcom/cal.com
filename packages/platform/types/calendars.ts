import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { Transform } from "class-transformer";
import { IsNumber, IsString, IsOptional, IsArray, ValidateNested, Validate } from "class-validator";

import { IsYearMonthDays } from "./validators/isYearMonthDays";

export class Calendar {
  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  credentialId!: number;

  @IsString()
  externalId!: string;
}

export class CalendarBusyTimesInput {
  @ApiProperty({
    required: true,
    description: "The timezone of the logged in user represented as a string",
    example: "America/New_York",
  })
  @IsString()
  loggedInUsersTz!: string;

  @ApiProperty({
    required: false,
    description: "The starting date for the busy times query",
    example: "2023-10-01",
  })
  @IsString()
  @IsOptional()
  @Validate(IsYearMonthDays)
  dateFrom?: string | null;

  @ApiProperty({
    required: false,
    description: "The ending date for the busy times query",
    example: "2023-10-31",
  })
  @IsString()
  @IsOptional()
  @Validate(IsYearMonthDays)
  dateTo?: string | null;

  @ApiProperty({
    required: true,
    description: "An array of Calendar objects representing the calendars to be loaded",
    example: `[{ credentialId: "1", externalId: "AQgtJE7RnHEeyisVq2ENs2gAAAgEGAAAACgtJE7RnHEeyisVq2ENs2gAAAhSDAAAA" }, { credentialId: "2", externalId: "AQM7RnHEeyisVq2ENs2gAAAhFDBBBBB" }]`,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Calendar)
  calendarsToLoad!: Calendar[];
}
