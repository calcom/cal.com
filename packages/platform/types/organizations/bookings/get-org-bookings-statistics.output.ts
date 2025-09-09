import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsNumber, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

class BookingsStatistics {
  @IsNumber()
  @ApiProperty({ example: 150, description: "Total number of bookings created" })
  created!: number;

  @IsNumber()
  @ApiProperty({ example: 120, description: "Number of accepted bookings" })
  accepted!: number;

  @IsNumber()
  @ApiProperty({ example: 15, description: "Number of rescheduled bookings" })
  rescheduled!: number;

  @IsNumber()
  @ApiProperty({ example: 10, description: "Number of cancelled bookings" })
  cancelled!: number;

  @IsNumber()
  @ApiProperty({ example: 5, description: "Number of pending bookings" })
  pending!: number;

  @IsNumber()
  @ApiProperty({ example: 3, description: "Number of no-show bookings" })
  noShow!: number;

  @IsNumber()
  @ApiProperty({ example: 4.2, description: "Average rating from accepted bookings" })
  averageRating!: number;

  @IsNumber()
  @ApiProperty({ example: 85, description: "Customer satisfaction score percentage" })
  csatScore!: number;
}

export class GetOrganizationsBookingsStatisticsOutput_2024_08_13 {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({ type: () => BookingsStatistics })
  @Type(() => BookingsStatistics)
  @ValidateNested()
  data!: BookingsStatistics;
}
