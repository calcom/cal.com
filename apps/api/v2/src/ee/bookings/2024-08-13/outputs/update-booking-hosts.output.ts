import { ApiProperty } from "@nestjs/swagger";
import type { BookingOutput_2024_08_13 } from "@calcom/platform-types";

export class UpdateBookingHostsOutput_2024_08_13 {
  @ApiProperty({ example: "success", enum: ["success", "error"] })
  status!: string;

  @ApiProperty({
    description: "Updated booking with new hosts",
  })
  data!: BookingOutput_2024_08_13;
}
