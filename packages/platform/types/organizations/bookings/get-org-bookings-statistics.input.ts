import { ApiProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsArray, IsISO8601, IsNumber, IsOptional, IsString, ArrayMinSize } from "class-validator";

export class DateRangeInput {
  @IsISO8601({ strict: true }, { message: "fromDate must be a valid ISO 8601 date." })
  @ApiProperty({
    type: String,
    description: "Start date for the statistics period in ISO 8601 format in UTC timezone.",
    example: "2024-01-01T00:00:00.000Z",
  })
  fromDate!: string;

  @IsISO8601({ strict: true }, { message: "toDate must be a valid ISO 8601 date." })
  @ApiProperty({
    type: String,
    description: "End date for the statistics period in ISO 8601 format in UTC timezone.",
    example: "2024-12-31T23:59:59.999Z",
  })
  toDate!: string;
}

export class GetOrgBookingsStatisticsInput {
  @Type(() => DateRangeInput)
  @ApiProperty({
    type: DateRangeInput,
    description: "Date range for which to calculate booking statistics.",
  })
  dateRange!: DateRangeInput;

  @IsString()
  @ApiProperty({
    type: String,
    description: "The timezone for date calculations and filtering.",
    example: "America/New_York",
  })
  timezone!: string;

  @IsArray()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return value.split(",").map((userId: string) => parseInt(userId));
    }
    if (Array.isArray(value)) {
      return value.map((userId: string | number) => +userId);
    }
    return value;
  })
  @IsNumber({}, { each: true })
  @ArrayMinSize(1, { message: "userIds must contain at least 1 user id" })
  @ApiProperty({
    type: String,
    required: false,
    description: "Filter statistics by specific user IDs within the organization.",
    example: "?userIds=100,200",
  })
  userIds?: number[];

  @IsArray()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return value.split(",").map((teamId: string) => parseInt(teamId));
    }
    if (Array.isArray(value)) {
      return value.map((teamId: string | number) => +teamId);
    }
    return value;
  })
  @IsNumber({}, { each: true })
  @ArrayMinSize(1, { message: "teamIds must contain at least 1 team id" })
  @ApiProperty({
    type: String,
    required: false,
    description: "Filter statistics by specific team IDs within the organization.",
    example: "?teamIds=50,60",
  })
  teamIds?: number[];
}
