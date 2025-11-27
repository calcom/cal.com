import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { Transform } from "class-transformer";
import { IsNumber, IsString, IsArray, ValidateNested, IsDateString, IsOptional, ValidateIf } from "class-validator";

export class Calendar {
  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @ApiProperty()
  credentialId!: number;

  @IsString()
  @ApiProperty()
  externalId!: string;
}

export class CalendarBusyTimesInput {
  @ApiProperty({
    required: false,
    deprecated: true,
    description: "Deprecated: Use timeZone instead. The timezone of the user represented as a string",
    example: "America/New_York",
  })
  @IsOptional()
  @IsString()
  loggedInUsersTz?: string;

  @ApiProperty({
    required: false,
    description: "The timezone for the busy times query represented as a string",
    example: "America/New_York",
  })
  @IsOptional()
  @IsString()
  timeZone?: string;

  @ValidateIf((o) => !o.timeZone && !o.loggedInUsersTz)
  @IsString()
  private readonly _timezoneValidation?: never;

  @ApiProperty({
    required: false,
    description: "The starting date for the busy times query",
    example: "2023-10-01",
  })
  @IsString()
  @IsDateString()
  dateFrom!: string;

  @ApiProperty({
    required: false,
    description: "The ending date for the busy times query",
    example: "2023-10-31",
  })
  @IsString()
  @IsDateString()
  dateTo!: string;

  @ApiProperty({
    type: [Calendar],
    required: true,
    description: "An array of Calendar objects representing the calendars to be loaded",
    example: `[{ credentialId: "1", externalId: "AQgtJE7RnHEeyisVq2ENs2gAAAgEGAAAACgtJE7RnHEeyisVq2ENs2gAAAhSDAAAA" }, { credentialId: "2", externalId: "AQM7RnHEeyisVq2ENs2gAAAhFDBBBBB" }]`,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Calendar)
  calendarsToLoad!: Calendar[];
}
