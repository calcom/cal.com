import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsOptional, IsString, IsTimeZone, Validate } from "class-validator";
import { isValidPhoneNumber } from "libphonenumber-js/max";
import type { BookingLanguageType } from "./language";
import { BookingLanguage } from "./language";

export class AddAttendeeInput_2024_08_13 {
  @ApiProperty({
    type: String,
    description: "The email of the attendee.",
    example: "john.doe@example.com",
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    type: String,
    description: "The name of the attendee.",
    example: "John Doe",
  })
  @IsString()
  name!: string;

  @ApiProperty({
    type: String,
    description: "The time zone of the attendee.",
    example: "Asia/Jerusalem",
  })
  @IsTimeZone()
  timeZone!: string;

  @ApiPropertyOptional({
    type: String,
    description: "The phone number of the attendee in international format.",
    example: "+919876543210",
  })
  @IsOptional()
  @Validate((value: string) => !value || isValidPhoneNumber(value), {
    message: "Invalid phone number format. Please use international format.",
  })
  phoneNumber?: string;

  @ApiPropertyOptional({
    enum: BookingLanguage,
    description: "The preferred language of the attendee. Used for booking confirmation.",
    example: BookingLanguage.it,
    default: BookingLanguage.en,
  })
  @IsEnum(BookingLanguage)
  @IsOptional()
  language?: BookingLanguageType;
}
