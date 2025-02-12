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
  IsEmail,
  ValidateNested,
} from "class-validator";

class Location {
  @IsString()
  @ApiProperty()
  optionValue!: string;

  @IsString()
  @ApiProperty()
  value!: string;
}

class Response {
  @IsString()
  @ApiProperty()
  name!: string;

  @IsEmail()
  @ApiProperty()
  email!: string;

  @IsArray()
  @IsString({ each: true })
  @ApiProperty({ type: [String] })
  guests!: string[];

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

  @Type(() => Response)
  @ApiProperty({ type: Response })
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
  _shouldServeCache?: boolean;

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
}
