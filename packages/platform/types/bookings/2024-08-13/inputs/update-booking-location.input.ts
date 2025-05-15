import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class BookingInputLocation_2024_08_13 {
  @IsString()
  @ApiProperty({
    example: "https://example.com/meeting",
    description: "Location of the booking",
  })
  location!: string;
}
