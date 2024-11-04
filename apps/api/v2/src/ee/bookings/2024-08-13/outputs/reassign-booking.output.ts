import { ApiProperty, getSchemaPath } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";
import { ReassignAutoBookingOutput_2024_08_13 } from "@calcom/platform-types";

export class ReassignBookingOutput_2024_08_13 {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    oneOf: [{ $ref: getSchemaPath(ReassignAutoBookingOutput_2024_08_13) }],
    description:
      "Booking data, which can be either a ReassignAutoBookingOutput object or a ReassignManualBookingOutput object",
  })
  @ValidateNested()
  @Type(() => Object)
  data!: ReassignAutoBookingOutput_2024_08_13;
}
