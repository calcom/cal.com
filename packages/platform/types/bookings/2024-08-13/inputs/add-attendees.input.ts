import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsEmail, ArrayMinSize } from "class-validator";

export class AddAttendeesInput_2024_08_13 {
  @ArrayMinSize(1)
  @IsArray()
  @IsEmail({}, { each: true })
  @ApiProperty({
    type: [String],
    description: "Array of attendee email addresses to add to the booking",
    example: ["john.doe@example.com", "jane.smith@example.com"],
  })
  attendees!: string[];
}
