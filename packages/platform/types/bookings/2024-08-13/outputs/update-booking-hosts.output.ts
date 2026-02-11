import { ApiProperty } from "@nestjs/swagger";
import { BookingOutput_2024_08_13 } from "./booking.output";

export class UpdateBookingHostsOutput_2024_08_13 {
  @ApiProperty({ example: "success", enum: ["success", "error"] })
  status!: string;

  @ApiProperty({
    type: () => BookingOutput_2024_08_13,
    description: "Updated booking with new hosts",
  })
  data!: BookingOutput_2024_08_13;
}
