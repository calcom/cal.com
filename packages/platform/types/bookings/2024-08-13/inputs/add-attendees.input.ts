import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsEmail, ArrayMinSize } from "class-validator";

export class AddGuestsInput_2024_08_13 {
  @ArrayMinSize(1)
  @IsArray()
  @IsEmail({}, { each: true })
  @ApiProperty({
    type: [String],
    description: "Array of guest email addresses to add to the booking",
    example: ["john.doe@example.com", "jane.smith@example.com"],
  })
  guests!: string[];
}
