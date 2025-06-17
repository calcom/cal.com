import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { BookingOutput_2024_08_13 } from "@calcom/platform-types";

export class UpdateBookingHostsOutput_2024_08_13 {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS] })
  @IsString()
  status!: typeof SUCCESS_STATUS;

  @ApiProperty({
    type: BookingOutput_2024_08_13,
    description: "Updated booking with new hosts",
  })
  data!: BookingOutput_2024_08_13;
}
