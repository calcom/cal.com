import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayNotEmpty,
  IsBoolean,
  IsOptional,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import { IsNotEmpty, IsArray } from "class-validator";

// Custom constraint to validate ICS URLs
@ValidatorConstraint({ async: false })
export class IsICSUrlConstraint implements ValidatorConstraintInterface {
  validate(url: unknown) {
    if (typeof url !== "string") return false;

    // Check if it's a valid URL and ends with .ics
    try {
      const urlObject = new URL(url);
      return (
        urlObject.protocol === "http:" || urlObject.protocol === "https:"
      );
    } catch (error) {
      return false;
    }
  }

  defaultMessage() {
    return "The URL must be a valid HTTP or HTTPS URL pointing to an iCalendar feed";
  }
}

export class CreateIcsFeedInputDto {
  @ApiProperty({
    example: ["https://cal.com/ics/feed.ics", "https://caldav.example.com/calendars/MyCalendar?export"],
    description: "An array of ICS URLs",
    type: "array",
    items: {
      type: "string",
      example: "https://cal.com/ics/feed.ics",
    },
    required: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsNotEmpty({ each: true })
  @Validate(IsICSUrlConstraint, { each: true }) // Apply the custom validator to each element in the array
  urls!: string[];

  @IsBoolean()
  @ApiPropertyOptional({
    example: false,
    description: "Whether to allowing writing to the calendar or not",
    type: "boolean",
    default: true,
  })
  @IsOptional()
  readOnly?: boolean = true;
}
