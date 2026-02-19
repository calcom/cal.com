import { ApiProperty } from "@nestjs/swagger";
import { IsEmail } from "class-validator";
import { BaseBookingAttendee } from "./create-booking.input";

export class AddAttendeeInput_2024_08_13 extends BaseBookingAttendee {
  @ApiProperty({
    type: String,
    description: "The email of the attendee.",
    example: "john.doe@example.com",
  })
  @IsEmail()
  email!: string;
}
