import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEmail,
  ArrayMinSize,
  ArrayMaxSize,
  IsString,
  IsOptional,
  IsTimeZone,
  IsEnum,
  Validate,
  ValidateNested,
} from "class-validator";
import { isValidPhoneNumber } from "libphonenumber-js";

import type { BookingLanguageType } from "./language";
import { BookingLanguage } from "./language";

class Guest {
  @ApiProperty({
    type: String,
    description: "The email of the guest.",
    example: "john.doe@example.com",
  })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    type: String,
    description: "The name of the guest.",
    example: "John Doe",
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    type: String,
    description: "The time zone of the guest.",
    example: "America/New_York",
  })
  @IsTimeZone()
  @IsOptional()
  timeZone?: string;

  @ApiPropertyOptional({
    type: String,
    description: "The phone number of the guest in international format.",
    example: "+919876543210",
  })
  @IsOptional()
  @Validate((value: string) => !value || isValidPhoneNumber(value), {
    message: "Invalid phone number format. Please use international format.",
  })
  phoneNumber?: string;

  @ApiPropertyOptional({
    enum: BookingLanguage,
    description: "The preferred language of the guest. Used for booking confirmation.",
    example: BookingLanguage.it,
    default: BookingLanguage.en,
  })
  @IsEnum(BookingLanguage)
  @IsOptional()
  language?: BookingLanguageType;
}

export class AddGuestsInput_2024_08_13 {
  @ArrayMinSize(1)
  @ArrayMaxSize(10, { message: "Cannot add more than 10 guests at a time" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Guest)
  @ApiProperty({
    type: [Guest],
    description: "Array of guests to add to the booking. Maximum 10 guests per request.",
    example: [
      {
        email: "john.doe@example.com",
        name: "John Doe",
        timeZone: "America/New_York",
      },
      {
        email: "jane.smith@example.com",
        name: "Jane Smith",
      },
    ],
  })
  guests!: Guest[];
}
