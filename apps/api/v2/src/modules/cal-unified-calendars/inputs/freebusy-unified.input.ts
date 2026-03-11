import { BadRequestException } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsISO8601, IsOptional, IsTimeZone, Validate, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from "class-validator";

@ValidatorConstraint({ name: "isAfterFrom", async: false })
class IsAfterFrom implements ValidatorConstraintInterface {
  validate(to: string, args: ValidationArguments) {
    const obj = args.object as { from?: string };
    if (!obj.from || !to) return true;
    if (new Date(to).getTime() < new Date(obj.from).getTime()) {
      return false;
    }
    }
    return true;
  }
  defaultMessage() {
    return "'to' must not be before 'from'";
  }
}

export class FreebusyUnifiedInput {
  @IsISO8601()
  @ApiProperty({
    type: String,
    description: "Start of the date range (ISO 8601 date or date-time)",
    example: "2026-03-10",
  })
  from!: string;

  @IsISO8601()
  @Validate(IsAfterFrom)
  @ApiProperty({
    type: String,
    description: "End of the date range (ISO 8601 date or date-time)",
    example: "2026-03-10",
  })
  to!: string;

  @IsTimeZone()
  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    description: "IANA time zone (e.g. America/New_York)",
  })
  timeZone?: string;
}
