import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, Min, Max } from "class-validator";

import { MAX_SEATS_PER_TIME_SLOT } from "@calcom/platform-constants";

// Class representing the seat options
export class Seats_2024_06_14 {
  @IsInt()
  @Min(1)
  @Max(MAX_SEATS_PER_TIME_SLOT)
  @ApiProperty({
    description: "Number of seats available per time slot",
    example: 4,
  })
  seatsPerTimeSlot!: number;

  @IsBoolean()
  @ApiProperty({
    description: "Show attendee information to other guests",
    example: true,
  })
  showAttendeeInfo!: boolean;

  @IsBoolean()
  @ApiProperty({
    description: "Display the count of available seats",
    example: true,
  })
  showAvailabilityCount!: boolean;

  @IsOptional()
  @IsBoolean()
  disabled?: boolean = false;
}

export type SeatOptionsTransformedSchema = {
  seatsPerTimeSlot: number;
  seatsShowAttendees: boolean;
  seatsShowAvailabilityCount: boolean;
};

export type SeatOptionsDisabledSchema = {
  seatsPerTimeSlot: null;
};
