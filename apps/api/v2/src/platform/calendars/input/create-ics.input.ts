import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayNotEmpty,
  IsBoolean,
  IsOptional,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  isURL,
  IsNotEmpty,
  IsArray,
} from "class-validator";

// Custom constraint to validate ICS URLs
@ValidatorConstraint({ async: false })
export class IsICSUrlConstraint implements ValidatorConstraintInterface {
  validate(url: unknown) {
    if (typeof url !== "string") return false;

    // Validates HTTP/HTTPS, requires a valid protocol, and protects against SSRF
    // by blocking local IPs and requiring a TLD in production environments.
    return isURL(url, {
      protocols: ["http", "https"],
      require_protocol: true,
      require_valid_protocol: true,
      require_tld: process.env.NODE_ENV === "production",
      host_blacklist: ["localhost", "127.0.0.1", "::1"],
    });
  }

  defaultMessage() {
    return "The URL must be a valid HTTP/HTTPS URL pointing to a public calendar feed";
  }
}

export class CreateIcsFeedInputDto {
  @ApiProperty({
    example: ["https://cal.com/ics/feed.ics", "http://cal.com/ics/feed.ics"],
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