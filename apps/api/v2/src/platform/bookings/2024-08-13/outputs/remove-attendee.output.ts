import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsEnum, ValidateNested } from "class-validator";

export class RemovedAttendeeOutput_2024_08_13 {
  @ApiProperty({
    type: Number,
    description: "The ID of the attendee.",
    example: 123,
  })
  @Expose()
  id!: number;

  @ApiProperty({
    type: Number,
    description: "The ID of the booking.",
    example: 456,
  })
  @Expose()
  bookingId!: number;

  @ApiProperty({
    type: String,
    description: "The name of the attendee.",
    example: "John Doe",
  })
  @Expose()
  name!: string;

  @ApiProperty({
    type: String,
    description: "The email of the attendee.",
    example: "john.doe@example.com",
  })
  @Expose()
  email!: string;

  @ApiProperty({
    type: String,
    description: "The time zone of the attendee.",
    example: "America/New_York",
  })
  @Expose()
  timeZone!: string;
}

export class RemoveAttendeeOutput_2024_08_13 {
  @ApiProperty({
    type: String,
    example: SUCCESS_STATUS,
    enum: [SUCCESS_STATUS, ERROR_STATUS],
  })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: RemovedAttendeeOutput_2024_08_13,
  })
  @Expose()
  @ValidateNested()
  @Type(() => RemovedAttendeeOutput_2024_08_13)
  data!: RemovedAttendeeOutput_2024_08_13;
}
