import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { BookingAttendee } from "@calcom/platform-types";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsEnum, IsNumber, ValidateNested } from "class-validator";

export class BookingAttendeeOutput_2024_08_13 extends BookingAttendee {
  @ApiProperty({ type: Number, example: 251 })
  @IsNumber()
  @Expose()
  id!: number;

  @ApiProperty({ type: Number, example: 313 })
  @IsNumber()
  @Expose()
  bookingId!: number;
}

export class AddAttendeeOutput_2024_08_13 {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({ type: BookingAttendeeOutput_2024_08_13 })
  @ValidateNested()
  @Type(() => BookingAttendeeOutput_2024_08_13)
  data!: BookingAttendeeOutput_2024_08_13;
}
