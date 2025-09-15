import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNumber, IsString, IsDateString } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class MySeatOutput_2024_08_13 {
  @ApiProperty({ description: "The unique identifier for the booking seat", example: "seat_abc123" })
  @IsString()
  seatUid!: string;

  @ApiProperty({ description: "The seat number within the booking", example: 1 })
  @IsNumber()
  seatNumber!: number;

  @ApiProperty({ description: "The booking UID that this seat belongs to", example: "booking_xyz789" })
  @IsString()
  bookingUid!: string;

  @ApiProperty({ description: "The start time of the booking", example: "2024-01-01T10:00:00Z" })
  @IsDateString()
  startTime!: string;

  @ApiProperty({ description: "The end time of the booking", example: "2024-01-01T11:00:00Z" })
  @IsDateString()
  endTime!: string;

  @ApiProperty({ description: "The title of the event", example: "Team Meeting" })
  @IsString()
  title!: string;
}

export class GetMySeatOutput_2024_08_13 {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    description: "The seat information for the authenticated user",
    type: MySeatOutput_2024_08_13,
  })
  data!: MySeatOutput_2024_08_13;
}