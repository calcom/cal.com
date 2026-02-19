import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsEnum, ValidateNested } from "class-validator";

import { BookingAttendeeOutput_2024_08_13 } from "./add-attendee.output";

export class GetBookingAttendeesOutput_2024_08_13 {
  @ApiProperty({
    example: SUCCESS_STATUS,
    enum: [SUCCESS_STATUS, ERROR_STATUS],
  })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({ type: [BookingAttendeeOutput_2024_08_13] })
  @ValidateNested({ each: true })
  @IsArray()
  @Type(() => BookingAttendeeOutput_2024_08_13)
  data!: BookingAttendeeOutput_2024_08_13[];
}

export class GetBookingAttendeeOutput_2024_08_13 {
  @ApiProperty({
    example: SUCCESS_STATUS,
    enum: [SUCCESS_STATUS, ERROR_STATUS],
  })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({ type: BookingAttendeeOutput_2024_08_13 })
  @ValidateNested()
  @Type(() => BookingAttendeeOutput_2024_08_13)
  data!: BookingAttendeeOutput_2024_08_13;
}
