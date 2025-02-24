import { ApiProperty, ApiExtraModels, getSchemaPath } from "@nestjs/swagger";
import { IsEnum, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";
import {
  BookingOutput_2024_08_13,
  GetRecurringSeatedBookingOutput_2024_08_13,
  GetSeatedBookingOutput_2024_08_13,
  RecurringBookingOutput_2024_08_13,
} from "@calcom/platform-types";

@ApiExtraModels(
  BookingOutput_2024_08_13,
  RecurringBookingOutput_2024_08_13,
  GetSeatedBookingOutput_2024_08_13,
  GetRecurringSeatedBookingOutput_2024_08_13
)
export class GetBookingsOutput_2024_08_13 {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: "array",
    items: {
      oneOf: [
        { $ref: getSchemaPath(BookingOutput_2024_08_13) },
        { $ref: getSchemaPath(RecurringBookingOutput_2024_08_13) },
        { $ref: getSchemaPath(GetSeatedBookingOutput_2024_08_13) },
        { $ref: getSchemaPath(GetRecurringSeatedBookingOutput_2024_08_13) },
      ],
    },
    description:
      "Array of booking data, which can contain either BookingOutput objects or RecurringBookingOutput objects",
  })
  @ValidateNested({ each: true })
  data!: (
    | BookingOutput_2024_08_13
    | RecurringBookingOutput_2024_08_13
    | GetSeatedBookingOutput_2024_08_13
    | GetRecurringSeatedBookingOutput_2024_08_13
  )[];

  error?: Error;
}
