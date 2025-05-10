import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNumber, IsString } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class BookingReference {
  @IsString()
  @ApiProperty({
    description: "The type of the booking reference",
  })
  type!: string;

  @IsString()
  @ApiProperty({
    description: "The event uid of the booking",
  })
  eventUid!: string;

  @IsString()
  @ApiProperty({
    description: "The id of the calendar the event is created in",
    nullable: true,
  })
  destinationCalendarId!: string | null;

  @IsNumber()
  @ApiProperty({
    description: "The id of the booking reference",
  })
  id!: number;
}

export class BookingReferencesOutput_2024_08_13 {
  @ApiProperty({
    description: "The status of the request, always 'success' for successful responses",
    example: SUCCESS_STATUS,
  })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    description: "Booking References",
    type: [BookingReference],
  })
  data!: BookingReference[];
}
