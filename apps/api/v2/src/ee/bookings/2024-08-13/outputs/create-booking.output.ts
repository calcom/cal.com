import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  BookingOutput_2024_08_13,
  CreateRecurringSeatedBookingOutput_2024_08_13,
  CreateSeatedBookingOutput_2024_08_13,
  RecurringBookingOutput_2024_08_13,
} from "@calcom/platform-types";
import { ApiExtraModels, ApiProperty, getSchemaPath } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, ValidateNested } from "class-validator";

@ApiExtraModels(
  BookingOutput_2024_08_13,
  RecurringBookingOutput_2024_08_13,
  CreateSeatedBookingOutput_2024_08_13,
  CreateRecurringSeatedBookingOutput_2024_08_13
)
export class CreateBookingOutput_2024_08_13 {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ValidateNested()
  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(BookingOutput_2024_08_13) },
      { type: "array", items: { $ref: getSchemaPath(RecurringBookingOutput_2024_08_13) } },
      { $ref: getSchemaPath(CreateSeatedBookingOutput_2024_08_13) },
      { type: "array", items: { $ref: getSchemaPath(CreateRecurringSeatedBookingOutput_2024_08_13) } },
    ],
    description:
      "Booking data, which can be either a BookingOutput object or an array of RecurringBookingOutput objects",
  })
  @Type(() => Object)
  data!:
    | BookingOutput_2024_08_13
    | RecurringBookingOutput_2024_08_13[]
    | CreateSeatedBookingOutput_2024_08_13
    | CreateRecurringSeatedBookingOutput_2024_08_13[];
}
