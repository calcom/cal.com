import { ApiProperty } from "@nestjs/swagger";
import { ApiProperty as DocsProperty } from "@nestjs/swagger";
import { IsEmail, IsInt, IsString, IsTimeZone } from "class-validator";

export class CreateAttendeeInput_2024_09_04 {
  @IsInt()
  @ApiProperty({
    description: "The ID of the booking to add the attendee to",
    example: 123,
  })
  @DocsProperty()
  bookingId!: number;

  @IsEmail()
  @ApiProperty({
    description: "Email address of the attendee",
    example: "attendee@example.com",
  })
  @DocsProperty()
  email!: string;

  @IsString()
  @ApiProperty({
    description: "Full name of the attendee",
    example: "John Doe",
  })
  @DocsProperty()
  name!: string;

  @IsTimeZone()
  @ApiProperty({
    description: "Timezone of the attendee",
    example: "America/New_York",
  })
  @DocsProperty()
  timeZone!: string;
}
