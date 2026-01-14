import { ApiProperty, ApiPropertyOptional, ApiHideProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsTimeZone,
  IsNumber,
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  ValidateNested,
  isEmail,
  Validate,
  IsInt,
} from "class-validator";
import { ValidationOptions, registerDecorator } from "class-validator";

import { RESCHEDULED_BY_DOCS } from "@calcom/platform-types";

type BookingName = { firstName: string; lastName: string };

function ValidateBookingName(validationOptions?: ValidationOptions) {
  return function (target: object, propertyName: string) {
    registerDecorator({
      name: "validateBookingName",
      target: target.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: string | Record<string, string>): boolean {
          if (typeof value === "string") {
            return value.trim().length > 0;
          }
          if (typeof value === "object" && value !== null) {
            return typeof value.firstName === "string" && value.firstName.trim().length > 0;
          }
          return false;
        },
        defaultMessage(): string {
          return "Name must be either a non-empty string or an object with non-empty firstName and lastName";
        },
      },
    });
  };
}

class Location {
  @IsString()
  @ApiProperty()
  optionValue!: string;

  @IsString()
  @ApiProperty()
  value!: string;
}

class Response {
  @ApiProperty({
    oneOf: [
      { type: "string" },
      { type: "object", properties: { firstName: { type: "string" }, lastName: { type: "string" } } },
    ],
  })
  @ValidateBookingName()
  name!: string | BookingName;

  @Validate((value: string) => !value || isEmail(value), {
    message: "Invalid response email",
  })
  @ApiProperty()
  email!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ type: [String] })
  guests?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => Location)
  @ApiPropertyOptional({ type: Location })
  location?: Location;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  notes?: string;
}

export class CreateBookingInput_2024_04_15 {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  end?: string;

  @IsString()
  @ApiProperty()
  start!: string;

  @IsNumber()
  @ApiProperty()
  eventTypeId!: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  eventTypeSlug?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  rescheduleUid?: string;

  @IsOptional()
  @ApiPropertyOptional({ description: RESCHEDULED_BY_DOCS })
  @Validate((value: string) => !value || isEmail(value), {
    message: "Invalid rescheduledBy email format",
  })
  rescheduledBy?: string;

  @IsTimeZone()
  @ApiProperty()
  timeZone!: string;

  @Transform(({ value }: { value: string | string[] }) => {
    return typeof value === "string" ? [value] : value;
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ type: [String] })
  user?: string[];

  @IsString()
  @ApiProperty()
  language!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  bookingUid?: string;

  @IsObject()
  @ApiProperty({ type: Object })
  metadata!: Record<string, string>;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  hasHashedBookingLink?: boolean;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  hashedLink!: string | null;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  seatReferenceUid?: string;

  @ApiProperty({ type: Response })
  @ValidateNested()
  @Type(() => Response)
  responses!: Response;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  orgSlug?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  locationUrl?: string;

  // note(rajiv): after going through getUrlSearchParamsToForward.ts we found out
  // that the below properties were not being included inside of handleNewBooking :- cc @morgan
  // cal.salesforce.rrSkipToAccountLookupField, cal.rerouting & cal.isTestPreviewLink
  // hence no input values have been setup for them in CreateBookingInput_2024_04_15
  @IsArray()
  @Type(() => Number)
  @IsOptional()
  @ApiHideProperty()
  routedTeamMemberIds?: number[];

  @IsNumber()
  @IsOptional()
  @ApiHideProperty()
  routingFormResponseId?: number;

  @IsBoolean()
  @IsOptional()
  @ApiHideProperty()
  skipContactOwner?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiHideProperty()
  _isDryRun?: boolean;

  // reroutingFormResponses is similar to rescheduling which can only be done by the organiser
  // won't really be necessary here in our usecase though :- cc @Hariom
  @IsObject()
  @IsOptional()
  @ApiHideProperty()
  reroutingFormResponses?: Record<
    string,
    {
      value: (string | number | string[]) & (string | number | string[] | undefined);
      label?: string | undefined;
    }
  >;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  teamMemberEmail?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  crmAppSlug?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  crmOwnerRecordType?: string;

  /* @ApiPropertyOptional({
    type: [Number],
    description:
      "For round robin event types, filter available hosts to only consider the specified subset of host user IDs. This allows you to book with specific hosts within a round robin event type.",
    example: [1, 2, 3],
  }) */
  @ApiHideProperty()
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  rrHostSubsetIds?: number[];
}
