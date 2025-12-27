import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, Min } from "class-validator";

export class BookerActiveBookingsLimitOutput_2024_06_14 {
  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({
    description: "The maximum number of active bookings a booker can have for this event type.",
    example: 3,
  })
  maximumActiveBookings?: number;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    description:
      "Whether to offer rescheduling the last active booking to the chosen time slot when limit is reached.",
  })
  offerReschedule?: boolean;
}
