import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { BookingAttendee } from "@calcom/platform-types";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsArray, IsEnum, IsNumber, ValidateNested } from "class-validator";

export class BookingAttendeeWithId_2024_08_13 extends BookingAttendee {
  @ApiProperty({ type: Number, example: 251 })
  @IsNumber()
  @Expose()
  id!: number;
}

export class GetBookingAttendeesOutput_2024_08_13 {
  @ApiProperty({
    example: SUCCESS_STATUS,
    enum: [SUCCESS_STATUS, ERROR_STATUS],
  })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({ type: [BookingAttendeeWithId_2024_08_13] })
  @ValidateNested({ each: true })
  @IsArray()
  @Type(() => BookingAttendeeWithId_2024_08_13)
  data!: BookingAttendeeWithId_2024_08_13[];
}

export class GetBookingAttendeeOutput_2024_08_13 {
  @ApiProperty({
    example: SUCCESS_STATUS,
    enum: [SUCCESS_STATUS, ERROR_STATUS],
  })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({ type: BookingAttendee })
  @ValidateNested()
  @Type(() => BookingAttendee)
  data!: BookingAttendee;
}
