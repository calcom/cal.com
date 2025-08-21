import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNumber, IsOptional } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class BookingsStatisticsData {
  @ApiProperty({
    type: Number,
    description: "Total number of bookings created in the date range.",
    example: 150,
  })
  @IsNumber()
  created!: number;

  @ApiProperty({
    type: Number,
    description: "Total number of bookings completed in the date range.",
    example: 120,
  })
  @IsNumber()
  completed!: number;

  @ApiProperty({
    type: Number,
    description: "Total number of bookings rescheduled in the date range.",
    example: 15,
  })
  @IsNumber()
  rescheduled!: number;

  @ApiProperty({
    type: Number,
    description: "Total number of bookings cancelled in the date range.",
    example: 10,
  })
  @IsNumber()
  cancelled!: number;

  @ApiProperty({
    type: Number,
    description: "Total number of bookings pending confirmation in the date range.",
    example: 5,
  })
  @IsNumber()
  pending!: number;

  @ApiProperty({
    type: Number,
    description: "Total number of no-show bookings in the date range.",
    example: 8,
  })
  @IsNumber()
  noShow!: number;

  @ApiProperty({
    type: Number,
    description: "Average rating across all completed bookings in the date range.",
    example: 4.2,
    nullable: true,
  })
  @IsNumber()
  @IsOptional()
  averageRating?: number | null;

  @ApiProperty({
    type: Number,
    description: "Customer Satisfaction (CSAT) score as a percentage (0-100).",
    example: 85.5,
    nullable: true,
  })
  @IsNumber()
  @IsOptional()
  CSATScore?: number | null;
}

export class GetOrgBookingsStatisticsOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: BookingsStatisticsData,
    description: "Comprehensive booking statistics for the organization.",
  })
  data!: BookingsStatisticsData;

  error?: Error;
}
