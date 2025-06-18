import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";
import { BookingOutput_2024_08_13 } from "@calcom/platform-types";

export class UpdateBookingHostsOutput_2024_08_13 {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: BookingOutput_2024_08_13,
    description: "Updated booking with new hosts",
  })
  @ValidateNested()
  @Type(() => Object)
  data!: BookingOutput_2024_08_13;
}
