import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsEmail, IsOptional, IsString, ArrayMinSize, ValidateNested } from "class-validator";

class AddAttendeeInput_2024_08_13 {
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
    example: "America/New_York",
  })
  @IsString()
  timeZone!: string;

  @ApiPropertyOptional({
    type: String,
    description: "The phone number of the attendee in international format.",
    example: "+19876543210",
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}

export class AddAttendeesInput_2024_08_13 {
  @ArrayMinSize(1)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddAttendeeInput_2024_08_13)
  @ApiProperty({
    type: [AddAttendeeInput_2024_08_13],
    description: "Array of attendees to add to the booking",
  })
  attendees!: AddAttendeeInput_2024_08_13[];
}
