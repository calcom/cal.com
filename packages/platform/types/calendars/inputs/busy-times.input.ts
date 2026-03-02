import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsTimeZone,
  registerDecorator,
  ValidateNested,
  type ValidationArguments,
  type ValidationOptions,
} from "class-validator";

import { normalizeTimezone } from "../../utils/normalizeTimezone";

function ValidateTimezoneRequired(
  validationOptions?: ValidationOptions
): (target: new (...args: unknown[]) => unknown) => void {
  return (target: new (...args: unknown[]) => unknown) => {
    registerDecorator({
      name: "validateTimezoneRequired",
      target: target as new (...args: unknown[]) => unknown,
      propertyName: "timeZone",
      options: validationOptions,
      constraints: [],
      validator: {
        validate(_: unknown, args: ValidationArguments): boolean {
          const obj = args.object as CalendarBusyTimesInput;
          return !!obj.timeZone || !!obj.loggedInUsersTz;
        },
        defaultMessage(): string {
          return "Either timeZone or loggedInUsersTz must be provided";
        },
      },
    });
  };
}

export class Calendar {
  @Transform(({ value }: { value: string }) => value && parseInt(value, 10))
  @IsNumber()
  @ApiHideProperty()
  credentialId!: number;

  @IsString()
  @ApiHideProperty()
  externalId!: string;
}

@ValidateTimezoneRequired()
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

  @ApiPropertyOptional({
    required: false,
    description: "The timezone for the busy times query represented as a string",
    example: "America/New_York",
  })
  @IsOptional()
  @IsString()
  @IsTimeZone()
  @Transform(({ value }) => normalizeTimezone(value))
  timeZone?: string;

  @ApiProperty({
    description: "The starting date for the busy times query",
    example: "2023-10-01",
  })
  @IsString()
  @IsDateString()
  dateFrom!: string;

  @ApiProperty({
    description: "The ending date for the busy times query",
    example: "2023-10-31",
  })
  @IsString()
  @IsDateString()
  dateTo!: string;

  @ApiHideProperty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Calendar)
  calendarsToLoad!: Calendar[];
}
