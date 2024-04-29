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
  optionValue!: string;

  @IsString()
  value!: string;
}

class Response {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsArray()
  @IsString({ each: true })
  guests!: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => Location)
  location?: Location;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateBookingInput {
  @IsString()
  @IsOptional()
  end?: string;

  @IsString()
  start!: string;

  @IsNumber()
  eventTypeId!: number;

  @IsString()
  @IsOptional()
  eventTypeSlug?: string;

  @IsString()
  @IsOptional()
  rescheduleUid?: string;

  @IsString()
  @IsOptional()
  recurringEventId?: string;

  @IsTimeZone()
  timeZone!: string;

  @Transform(({ value }: { value: string | string[] }) => {
    return typeof value === "string" ? [value] : value;
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  user?: string[];

  @IsString()
  language!: string;

  @IsString()
  @IsOptional()
  bookingUid?: string;

  @IsObject()
  metadata!: Record<string, string>;

  @IsBoolean()
  @IsOptional()
  hasHashedBookingLink?: boolean;

  @IsString()
  @IsOptional()
  hashedLink!: string | null;

  @IsString()
  @IsOptional()
  seatReferenceUid?: string;

  @Type(() => Response)
  responses!: Response;

  @IsString()
  @IsOptional()
  locationUrl?: string;
}
